const { Server } = require('socket.io');
const { createServer } = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const admin = require('firebase-admin');

class MobileCompanionServer extends EventEmitter {
  constructor(renderManager, store) {
    super();
    this.renderManager = renderManager;
    this.store = store;
    this.server = null;
    this.io = null;
    this.httpServer = null;
    this.app = null;
    this.port = 8080;
    this.isRunning = false;
    
    // Pairing system
    this.currentPairingCode = null;
    this.pairingCodeExpiry = null;
    this.pairedDevices = new Map(); // deviceId -> { name, connectedAt, lastSeen }
    this.connectedClients = new Map(); // socketId -> { deviceId, socket }
    
    // Push notifications
    this.deviceTokens = new Map(); // deviceId -> fcmToken
    this.firebaseInitialized = false;
    
    // Setup logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [Mobile Companion] ${level}: ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console()
      ]
    });

    this.setupExpress();
    this.loadPairedDevices();
    this.loadDeviceTokens();
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK for push notifications
   */
  initializeFirebase() {
    try {
      console.log('🔧 FIREBASE INITIALIZATION DEBUG:');
      console.log('📋 Environment variables check:');
      console.log('  - FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅ SET' : '❌ NOT SET');
      console.log('  - FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✅ SET (length: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')' : '❌ NOT SET');
      console.log('  - FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✅ SET' : '❌ NOT SET');
      
      // Check if Firebase is already initialized
      if (admin.apps.length > 0) {
        this.firebaseInitialized = true;
        console.log('✅ Firebase Admin SDK already initialized');
        this.logger.info('Firebase Admin SDK already initialized');
        return;
      }

      // For development, we'll use a default service account
      // In production, you should use a proper service account key file
      // This is a basic setup that should work with Firebase project
      const serviceAccount = {
        "type": "service_account",
        "project_id": process.env.FIREBASE_PROJECT_ID || "brs-mobile-companion",
        "private_key": process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : null,
        "client_email": process.env.FIREBASE_CLIENT_EMAIL || null
      };

      console.log('🔑 Service account prepared:');
      console.log('  - project_id:', serviceAccount.project_id);
      console.log('  - client_email:', serviceAccount.client_email ? '✅ SET' : '❌ NOT SET');
      console.log('  - private_key:', serviceAccount.private_key ? '✅ SET (length: ' + serviceAccount.private_key.length + ')' : '❌ NOT SET');

      // Only initialize if we have credentials
      if (serviceAccount.private_key && serviceAccount.client_email) {
        console.log('🚀 Initializing Firebase Admin SDK...');
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id
        });
        
        this.firebaseInitialized = true;
        console.log('✅ Firebase Admin SDK initialized successfully!');
        console.log('🔔 Push notifications are now ENABLED');
        this.logger.info('Firebase Admin SDK initialized successfully');
      } else {
        console.log('❌ Firebase credentials incomplete!');
        console.log('💡 Missing credentials:');
        if (!serviceAccount.private_key) console.log('  - FIREBASE_PRIVATE_KEY is missing');
        if (!serviceAccount.client_email) console.log('  - FIREBASE_CLIENT_EMAIL is missing');
        
        this.logger.warn('Firebase credentials not found. Push notifications will be disabled.');
        this.logger.warn('To enable push notifications, set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL environment variables.');
      }
    } catch (error) {
      console.log('❌ Firebase initialization FAILED!');
      console.log('🔍 Error details:', error.message);
      console.log('🔍 Error stack:', error.stack);
      this.logger.error(`Failed to initialize Firebase: ${error.message}`);
      this.firebaseInitialized = false;
    }
  }

  /**
   * Send push notification to a specific device
   */
  async sendPushNotification(deviceId, notification) {
    console.log('🔔 SENDING PUSH NOTIFICATION:');
    console.log('  - Target Device ID:', deviceId);
    console.log('  - Notification:', notification);
    console.log('  - Firebase initialized:', this.firebaseInitialized);
    
    if (!this.firebaseInitialized) {
      console.log('❌ Firebase not initialized, cannot send push notification');
      this.logger.warn('Firebase not initialized, cannot send push notification');
      return false;
    }

    const token = this.deviceTokens.get(deviceId);
    console.log('🔍 Looking up token for device:', deviceId);
    console.log('  - Token found:', token ? 'YES (' + token.substring(0, 20) + '...)' : 'NO');
    
    if (!token) {
      console.log('❌ No FCM token found for device:', deviceId);
      console.log('📋 Available devices:');
      for (const [id, t] of this.deviceTokens.entries()) {
        console.log(`  - ${id}: ${t.substring(0, 20)}...`);
      }
      this.logger.warn(`No FCM token found for device ${deviceId}`);
      return false;
    }

    try {
      // Convert all data values to strings for Firebase compatibility
      const stringifiedData = {};
      if (notification.data) {
        for (const [key, value] of Object.entries(notification.data)) {
          stringifiedData[key] = String(value);
        }
      }

      // Determine notification priority
      const isHighPriority = notification.data?.type === 'render_completed' || 
                            notification.data?.type === 'render_error' ||
                            notification.data?.type === 'error' ||
                            notification.data?.type === 'test_push' || // Test notifications get high priority
                            notification.title?.includes('Completed') ||
                            notification.title?.includes('Error') ||
                            notification.title?.includes('Failed') ||
                            notification.title?.includes('Test Push'); // Test notifications get high priority

      const message = {
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: stringifiedData,
        android: {
          priority: isHighPriority ? 'high' : 'normal',
          notification: {
            channel_id: isHighPriority ? 'brs_high_priority' : 'brs_default_channel',
            priority: isHighPriority ? 'high' : 'default',
            notification_priority: isHighPriority ? 'PRIORITY_HIGH' : 'PRIORITY_DEFAULT',
            visibility: 'public',
            default_sound: true,
            default_vibrate_timings: true,
            default_light_settings: true
          }
        },
        token: token
      };

      console.log('🚀 Sending Firebase message:', message);

      const response = await admin.messaging().send(message);
      console.log('✅ Push notification sent successfully!');
      console.log('  - Response:', response);
      this.logger.info(`Push notification sent successfully: ${response}`);
      return true;
    } catch (error) {
      console.log('❌ Failed to send push notification!');
      console.log('🔍 Error code:', error.code);
      console.log('🔍 Error message:', error.message);
      console.log('🔍 Full error:', error);
      this.logger.error(`Failed to send push notification: ${error.message}`);
      
      // If token is invalid, remove it
      if (error.code === 'messaging/registration-token-not-registered') {
        console.log('🗑️  Removing invalid token for device:', deviceId);
        this.logger.info(`Removing invalid token for device ${deviceId}`);
        this.deviceTokens.delete(deviceId);
        this.saveDeviceTokens();
      }
      
      return false;
    }
  }

  /**
   * Send push notification to all connected devices
   */
  async broadcastPushNotification(notification) {
    console.log('📢 BROADCASTING PUSH NOTIFICATION:');
    console.log('  - Notification:', notification);
    console.log('  - Firebase initialized:', this.firebaseInitialized);
    console.log('  - Registered devices count:', this.deviceTokens.size);
    
    if (!this.firebaseInitialized) {
      console.log('❌ Firebase not initialized, cannot broadcast push notification');
      this.logger.warn('Firebase not initialized, cannot broadcast push notification');
      return 0;
    }

    if (this.deviceTokens.size === 0) {
      console.log('❌ No registered devices for push notifications');
      return 0;
    }

    // Deduplicate tokens to avoid sending multiple notifications to same device
    const uniqueTokens = new Set();
    const tokenToDeviceId = new Map();
    
    console.log('🎯 Analyzing registered devices:');
    for (const [deviceId, token] of this.deviceTokens.entries()) {
      console.log(`  - Device ${deviceId}: ${token.substring(0, 20)}...`);
      if (!uniqueTokens.has(token)) {
        uniqueTokens.add(token);
        tokenToDeviceId.set(token, deviceId);
        console.log(`    ✅ New unique token`);
      } else {
        console.log(`    ⚠️  Duplicate token (skipping to prevent double notifications)`);
      }
    }

    console.log(`🔍 Sending to ${uniqueTokens.size} unique tokens (from ${this.deviceTokens.size} registered devices)`);

    let successCount = 0;
    for (const token of uniqueTokens) {
      const deviceId = tokenToDeviceId.get(token);
      const success = await this.sendPushNotification(deviceId, notification);
      if (success) successCount++;
    }

    console.log(`✅ Broadcast complete: ${successCount}/${uniqueTokens.size} notifications sent successfully`);
    this.logger.info(`Broadcast push notification sent to ${successCount}/${uniqueTokens.size} unique devices`);
    return successCount;
  }

  /**
   * Save device tokens to persistent storage
   */
  saveDeviceTokens() {
    try {
      const tokens = Object.fromEntries(this.deviceTokens);
      this.store.set('deviceTokens', tokens);
    } catch (error) {
      this.logger.error(`Error saving device tokens: ${error.message}`);
    }
  }

  /**
   * Load device tokens from persistent storage
   */
  loadDeviceTokens() {
    try {
      const tokens = this.store.get('deviceTokens', {});
      this.deviceTokens = new Map(Object.entries(tokens));
      this.logger.info(`Loaded ${this.deviceTokens.size} device tokens`);
    } catch (error) {
      this.logger.error(`Error loading device tokens: ${error.message}`);
    }
  }

  setupExpress() {
    this.app = express();
    
    // Add logging middleware to see all incoming requests
    this.app.use((req, res, next) => {
      console.log(`📡 HTTP ${req.method} ${req.url} from ${req.ip}`);
      next();
    });
    
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable CSP for development
      crossOriginEmbedderPolicy: false
    }));
    
    this.app.use(cors({
      origin: "*", // Allow all origins for LAN connections
      methods: ["GET", "POST"],
      credentials: false
    }));
    
    this.app.use(express.json());

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        server: 'Mobile Companion',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    });

    // Pairing code endpoint
    this.app.get('/api/pairing-code', (req, res) => {
      if (!this.currentPairingCode || Date.now() > this.pairingCodeExpiry) {
        res.status(404).json({ error: 'No active pairing code' });
        return;
      }
      
      res.json({
        code: this.currentPairingCode,
        expiresAt: this.pairingCodeExpiry
      });
    });

    // File browsing API endpoints
    this.setupFileAPI();
    
    // Create HTTP server
    this.httpServer = createServer(this.app);
  }

  setupFileAPI() {
    const fs = require('fs');
    const path = require('path');

    // Browse directory contents
    this.app.get('/api/browse', async (req, res) => {
      try {
        const { path: dirPath, filter } = req.query;
        const os = require('os');
        
        // If no path specified, show system drives on Windows or root on Unix
        let targetPath;
        if (!dirPath) {
          if (process.platform === 'win32') {
            // On Windows, show available drives
            const drives = [];
            for (let i = 65; i <= 90; i++) { // A-Z
              const driveLetter = String.fromCharCode(i);
              const drivePath = `${driveLetter}:\\`;
              if (fs.existsSync(drivePath)) {
                drives.push({
                  name: `${driveLetter}: Drive`,
                  path: drivePath,
                  type: 'drive',
                  size: 0,
                  modified: new Date().toISOString()
                });
              }
            }
            
            // Add common folders
            const homeDir = os.homedir();
            const commonFolders = [
              { name: 'Desktop', path: path.join(homeDir, 'Desktop') },
              { name: 'Documents', path: path.join(homeDir, 'Documents') },
              { name: 'Downloads', path: path.join(homeDir, 'Downloads') },
            ];
            
            const result = {
              currentPath: 'Computer',
              parentPath: null,
              items: [
                ...drives,
                ...commonFolders.filter(folder => fs.existsSync(folder.path)).map(folder => ({
                  name: folder.name,
                  path: folder.path,
                  type: 'directory',
                  size: 0,
                  modified: fs.statSync(folder.path).mtime.toISOString()
                }))
              ]
            };
            
            return res.json(result);
          } else {
            // On Unix-like systems, start from root
            targetPath = '/';
          }
        } else {
          targetPath = dirPath;
        }

        if (!fs.existsSync(targetPath)) {
          return res.status(404).json({ error: 'Path not found' });
        }

        const stats = fs.statSync(targetPath);
        if (!stats.isDirectory()) {
          return res.status(400).json({ error: 'Path is not a directory' });
        }

        const items = fs.readdirSync(targetPath, { withFileTypes: true });
        const result = {
          currentPath: targetPath,
          parentPath: path.dirname(targetPath),
          items: []
        };

        for (const item of items) {
          try {
            const itemPath = path.join(targetPath, item.name);
            const itemStats = fs.statSync(itemPath);
            
            const fileInfo = {
              name: item.name,
              path: itemPath,
              type: item.isDirectory() ? 'directory' : 'file',
              size: itemStats.size,
              modified: itemStats.mtime.toISOString()
            };

            // Apply filter if specified
            if (filter) {
              if (filter === 'blend' && !item.isDirectory() && !item.name.toLowerCase().endsWith('.blend')) {
                continue;
              }
              if (filter === 'directories' && !item.isDirectory()) {
                continue;
              }
            }

            result.items.push(fileInfo);
          } catch (error) {
            // Skip files we can't access
            continue;
          }
        }

        // Sort: directories first, then files, alphabetically
        result.items.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });

        res.json(result);
      } catch (error) {
        this.logger.error('Browse API error:', error);
        res.status(500).json({ error: 'Failed to browse directory' });
      }
    });

    // Get recent blend files
    this.app.get('/api/recent-files', async (req, res) => {
      try {
        const presets = await this.store.get('presets', []);
        const recentFiles = new Set();

        // Extract blend files from presets
        presets.forEach(preset => {
          if (preset.parameters?.blend_file) {
            recentFiles.add(preset.parameters.blend_file);
          }
        });

        // Get recent files from history (if available)
        const history = await this.store.get('fileHistory', []);
        history.forEach(file => {
          if (file.path && file.path.toLowerCase().endsWith('.blend')) {
            recentFiles.add(file.path);
          }
        });

        const result = Array.from(recentFiles)
          .filter(filePath => fs.existsSync(filePath))
          .map(filePath => {
            const stats = fs.statSync(filePath);
            return {
              name: path.basename(filePath),
              path: filePath,
              directory: path.dirname(filePath),
              size: stats.size,
              modified: stats.mtime.toISOString()
            };
          })
          .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
          .slice(0, 20); // Limit to 20 recent files

        res.json(result);
      } catch (error) {
        this.logger.error('Recent files API error:', error);
        res.status(500).json({ error: 'Failed to get recent files' });
      }
    });

    // Get all presets
    this.app.get('/api/presets', async (req, res) => {
      try {
        const presets = await this.store.get('presets', []);
        res.json(presets);
      } catch (error) {
        this.logger.error('Presets API error:', error);
        res.status(500).json({ error: 'Failed to get presets' });
      }
    });

    // Get specific preset
    this.app.get('/api/presets/:id', async (req, res) => {
      try {
        const presets = await this.store.get('presets', []);
        const preset = presets.find(p => p.id === req.params.id);
        
        if (!preset) {
          return res.status(404).json({ error: 'Preset not found' });
        }

        res.json(preset);
      } catch (error) {
        this.logger.error('Preset API error:', error);
        res.status(500).json({ error: 'Failed to get preset' });
      }
    });

    // Generate command from parameters
    this.app.post('/api/generate-command', async (req, res) => {
      try {
        const { parameters } = req.body;
        
        if (!parameters || !parameters.blender_path) {
          return res.status(400).json({ error: 'Missing required parameters' });
        }

        const command = await this.generateBlenderCommand(parameters);
        res.json({ command });
      } catch (error) {
        this.logger.error('Generate command API error:', error);
        res.status(500).json({ error: 'Failed to generate command' });
      }
    });

    // Get Blender installations
    this.app.get('/api/blender-paths', async (req, res) => {
      try {
        const blenderPaths = await this.findBlenderInstallations();
        res.json(blenderPaths);
      } catch (error) {
        this.logger.error('Blender paths API error:', error);
        res.status(500).json({ error: 'Failed to find Blender installations' });
      }
    });

    // Save/Update preset
    this.app.post('/api/presets', async (req, res) => {
      try {
        const { preset } = req.body;
        
        if (!preset || !preset.name) {
          return res.status(400).json({ error: 'Invalid preset data' });
        }

        // Get current presets
        const presets = await this.store.get('presets', []);
        
        let updatedPresets;
        if (preset.id && presets.find(p => p.id === preset.id)) {
          // Update existing preset - maintain exact order and structure
          const existingPreset = presets.find(p => p.id === preset.id);
          const updatedPreset = {
            id: preset.id,
            name: preset.name,
            version: preset.version || '1.0.0',
            createdAt: existingPreset.createdAt, // Keep original createdAt
            updatedAt: new Date().toISOString(),
            parameters: preset.parameters || {},
            metadata: {
              blenderVersion: preset.parameters?.blender_path || 'Unknown',
              renderEngine: preset.parameters?.render_engine || 'Unknown',
              lastUsed: new Date().toISOString()
            }
          };
          updatedPresets = presets.map(p => p.id === preset.id ? updatedPreset : p);
        } else {
          // Create new preset - exact order and structure as working preset
          const newPreset = {
            id: preset.id || require('crypto').randomUUID(),
            name: preset.name,
            version: preset.version || '1.0.0',
            createdAt: preset.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            parameters: preset.parameters || {},
            metadata: {
              blenderVersion: preset.parameters?.blender_path || 'Unknown',
              renderEngine: preset.parameters?.render_engine || 'Unknown',
              lastUsed: new Date().toISOString()
            }
          };
          updatedPresets = [...presets, newPreset];
        }

        // Save to store
        await this.store.set('presets', updatedPresets);
        
        res.json({ success: true, preset: updatedPresets[updatedPresets.length - 1] });
      } catch (error) {
        this.logger.error('Save preset API error:', error);
        res.status(500).json({ error: 'Failed to save preset' });
      }
    });

    // Delete preset
    this.app.delete('/api/presets/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const presets = await this.store.get('presets', []);
        const updatedPresets = presets.filter(p => p.id !== id);
        
        await this.store.set('presets', updatedPresets);
        
        res.json({ success: true });
      } catch (error) {
        this.logger.error('Delete preset API error:', error);
        res.status(500).json({ error: 'Failed to delete preset' });
      }
    });

    // Get render history
    this.app.get('/api/history', async (req, res) => {
      try {
        const history = await this.store.get('renderHistory', []);
        res.json(history);
      } catch (error) {
        this.logger.error('History API error:', error);
        res.status(500).json({ error: 'Failed to get history' });
      }
    });

    // Delete history entry
    this.app.delete('/api/history/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const history = await this.store.get('renderHistory', []);
        const updatedHistory = history.filter(h => h.id !== id);
        
        await this.store.set('renderHistory', updatedHistory);
        
        res.json({ success: true });
      } catch (error) {
        this.logger.error('Delete history API error:', error);
        res.status(500).json({ error: 'Failed to delete history entry' });
      }
    });

    // Clear all history
    this.app.delete('/api/history', async (req, res) => {
      try {
        await this.store.set('renderHistory', []);
        res.json({ success: true });
      } catch (error) {
        this.logger.error('Clear history API error:', error);
        res.status(500).json({ error: 'Failed to clear history' });
      }
    });
  }

  // Helper function to generate unique output file names
  generateUniqueOutputPath(outputPath, fileName) {
    const fs = require('fs');
    const path = require('path');
    
    // Parse the filename and extension
    const parsedPath = path.parse(fileName);
    const baseName = parsedPath.name;
    const extension = parsedPath.ext;
    
    // Build the full path
    let fullPath = path.join(outputPath, fileName);
    let counter = 1;
    
    // Keep checking until we find a filename that doesn't exist
    while (fs.existsSync(fullPath)) {
      const newFileName = `${baseName}_${counter.toString().padStart(3, '0')}${extension}`;
      fullPath = path.join(outputPath, newFileName);
      counter++;
      
      // Safety check to prevent infinite loop
      if (counter > 999) {
        // Fall back to timestamp-based naming
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const timestampFileName = `${baseName}_${timestamp}${extension}`;
        fullPath = path.join(outputPath, timestampFileName);
        break;
      }
    }
    
    return fullPath;
  }

  async generateBlenderCommand(parameters) {
    let command = `"${parameters.blender_path}" -b`;

    // Base Settings
    if (parameters.blend_file) {
      command += ` "${parameters.blend_file}"`;
    }

    // Render Settings
    if (parameters.render_enabled) {
      // Engine
      if (parameters.render_engine) {
        command += ` -E ${parameters.render_engine}`;
      }

      // Scene
      if (parameters.scene) {
        command += ` -S "${parameters.scene}"`;
      }
    }

    // Output Settings
    if (parameters.output_enabled) {
      // Output format
      if (parameters.output_format) {
        command += ` -F ${parameters.output_format.toUpperCase()}`;
      }

      // Output path and filename with duplicate prevention
      if (parameters.output_path && parameters.output_filename) {
        const uniqueOutputPath = this.generateUniqueOutputPath(
          parameters.output_path, 
          parameters.output_filename
        );
        command += ` -o "${uniqueOutputPath}"`;
      }
    }

    // Resolution Settings
    if (parameters.resolution_enabled) {
      if (parameters.resolution_x && parameters.resolution_y) {
        command += ` --render-output "${parameters.resolution_x}x${parameters.resolution_y}"`;
      }
      if (parameters.resolution_percentage) {
        command += ` --render-percentage ${parameters.resolution_percentage}`;
      }
    }

    // Frame Settings
    if (parameters.frames_enabled) {
      if (parameters.render_animation) {
        command += ` -s ${parameters.frame_start || 1}`;
        command += ` -e ${parameters.frame_end || 1}`;
        if (parameters.frame_jump && parameters.frame_jump > 1) {
          command += ` -j ${parameters.frame_jump}`;
        }
        command += ` -a`;
      } else if (parameters.single_frame !== undefined && parameters.single_frame !== null) {
        command += ` -f ${parameters.single_frame}`;
      }
    }

    return command;
  }

  async findBlenderInstallations() {
    const fs = require('fs');
    const path = require('path');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const installations = [];

    if (process.platform === 'win32') {
      // Common Blender installation paths on Windows
      const commonPaths = [
        path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Blender Foundation'),
        path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Blender Foundation'),
        path.join(require('os').homedir(), 'AppData', 'Local', 'Programs', 'Blender Foundation'),
      ];

      for (const basePath of commonPaths) {
        try {
          if (fs.existsSync(basePath)) {
            const versions = fs.readdirSync(basePath, { withFileTypes: true })
              .filter(dirent => dirent.isDirectory())
              .map(dirent => dirent.name);

            for (const version of versions) {
              const blenderExe = path.join(basePath, version, 'blender.exe');
              if (fs.existsSync(blenderExe)) {
                installations.push({
                  path: blenderExe,
                  version: version,
                  name: `Blender ${version}`
                });
              }
            }
          }
        } catch (error) {
          // Skip paths we can't access
          continue;
        }
      }
    }

    // Try to detect current Blender in PATH
    try {
      const { stdout } = await execAsync('blender --version');
      const versionMatch = stdout.match(/Blender\s+([\d.]+)/);
      if (versionMatch) {
        installations.push({
          path: 'blender',
          version: versionMatch[1],
          name: `Blender ${versionMatch[1]} (System PATH)`
        });
      }
    } catch (error) {
      // Blender not in PATH
    }

    return installations;
  }

  setupSocketIO() {
    console.log("🚀 SETTING UP SOCKET.IO SERVER");
    this.io = new Server(this.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });
    console.log("✅ SOCKET.IO SERVER CONFIGURED");

    // Authentication middleware
    this.io.use((socket, next) => {
      const { pairingCode, deviceId, deviceName } = socket.handshake.auth;
      
      console.log(`🔍 AUTH ATTEMPT - deviceId: ${deviceId}, pairingCode: ${pairingCode}, deviceName: ${deviceName}`);
      console.log(`🔍 CURRENT PAIRING CODE: ${this.currentPairingCode}, expiry: ${this.pairingCodeExpiry}`);
      console.log(`🔍 TIME NOW: ${Date.now()}, is valid: ${this.validatePairingCode(pairingCode)}`);
      
      // Check if device is already paired
      if (deviceId && this.pairedDevices.has(deviceId)) {
        socket.deviceId = deviceId;
        socket.deviceName = this.pairedDevices.get(deviceId).name;
        this.logger.info(`Authenticated paired device: ${socket.deviceName} (${deviceId})`);
        return next();
      }
      
      // Check pairing code for new devices
      if (pairingCode && this.validatePairingCode(pairingCode)) {
        const newDeviceId = crypto.randomUUID();
        socket.deviceId = newDeviceId;
        socket.deviceName = deviceName || 'Mobile Device';
        
        // Add to paired devices
        this.pairedDevices.set(newDeviceId, {
          name: socket.deviceName,
          connectedAt: new Date().toISOString(),
          lastSeen: new Date().toISOString()
        });
        
        this.savePairedDevices();
        this.clearPairingCode();
        
        console.log(`✅ NEW DEVICE PAIRED: ${socket.deviceName} (${newDeviceId})`);
        this.emit('device-paired', { deviceId: newDeviceId, deviceName: socket.deviceName });
        
        return next();
      }
      
      console.log(`❌ AUTHENTICATION FAILED for socket ${socket.id}`);
      console.log(`❌ REASON: No valid deviceId (${deviceId}) or pairingCode (${pairingCode})`);
      next(new Error('Authentication failed'));
    });

    this.io.on('connection', (socket) => {
      console.log(`🔌 NEW SOCKET CONNECTION ATTEMPT: ${socket.id}`);
      this.handleConnection(socket);
    });
  }

  handleConnection(socket) {
    this.logger.info(`Device connected: ${socket.deviceName} (${socket.deviceId})`);
    
    // Store connected client
    this.connectedClients.set(socket.id, {
      deviceId: socket.deviceId,
      socket: socket
    });

    // Update last seen
    if (this.pairedDevices.has(socket.deviceId)) {
      const device = this.pairedDevices.get(socket.deviceId);
      device.lastSeen = new Date().toISOString();
      this.pairedDevices.set(socket.deviceId, device);
      this.savePairedDevices();
    }

    // Send authenticated event with device ID to client
    socket.emit('authenticated', {
      deviceId: socket.deviceId,
      deviceName: socket.deviceName
    });

    // Send current render status
    this.sendRenderStatus(socket);

    // Setup event handlers
    this.setupSocketHandlers(socket);

    socket.on('disconnect', () => {
      this.logger.info(`Device disconnected: ${socket.deviceName} (${socket.deviceId})`);
      this.connectedClients.delete(socket.id);
    });
  }

  setupSocketHandlers(socket) {
    // Render control handlers
    socket.on('start-render', async (data) => {
      try {
        this.logger.info(`Start render request from ${socket.deviceName}`);
        
        if (!this.validateRenderParams(data)) {
          socket.emit('error', { message: 'Invalid render parameters' });
          return;
        }

        // Check if already rendering
        if (this.renderManager.hasActiveRenders()) {
          socket.emit('error', { message: 'Render already in progress' });
          return;
        }

        const processId = await this.renderManager.startRender(data.command, {
          send: (event, data) => {
            this.broadcastToClients('render-progress', { event, data });
            
            // Note: Push notifications are handled by main.js renderManager events
            // to avoid duplications
          }
        });

        this.broadcastToClients('render-started', { processId });
        
        // Note: Push notification for render start is handled by main.js to avoid duplications
        
      } catch (error) {
        this.logger.error(`Error starting render: ${error.message}`);
        socket.emit('error', { message: error.message });
      }
    });


    socket.on('stop-render', async (data) => {
      try {
        console.log('🛑 STOP RENDER REQUEST RECEIVED:');
        console.log('  - From device:', socket.deviceName);
        console.log('  - Device ID:', socket.deviceId);
        console.log('  - Request data:', data);
        
        this.logger.info(`Stop render request from ${socket.deviceName}`);
        
        if (data.processId) {
          console.log('  - Stopping specific process:', data.processId);
          await this.renderManager.stopProcess(data.processId);
        } else {
          console.log('  - Stopping all renders');
          this.renderManager.stopAllRenders();
        }
        
        const stopData = {
          processId: data.processId || null,
          stoppedBy: socket.deviceName || 'Unknown',
          stopTime: new Date().toISOString()
        };
        
        console.log('📡 Broadcasting render-stopped event with data:', stopData);
        this.broadcastToClients('render-stopped', stopData);
        
        // Note: Push notification for render stop is handled by main.js to avoid duplications
        
      } catch (error) {
        console.log('❌ STOP RENDER ERROR:', error.message);
        this.logger.error(`Error stopping render: ${error.message}`);
        socket.emit('error', { message: error.message });
      }
    });

    // Status requests
    socket.on('request-status', () => {
      this.sendRenderStatus(socket);
    });

    socket.on('request-system-stats', () => {
      // This would be implemented to get system stats
      // For now, send basic info
      socket.emit('system-stats', {
        cpu: { usage: '0%' },
        memory: { used: '0 GB', total: '0 GB', percentage: '0%' },
        gpu: []
      });
    });

    // Preset management
    socket.on('get-presets', async () => {
      try {
        const presets = this.store.get('presets', []);
        socket.emit('presets-list', presets);
      } catch (error) {
        socket.emit('error', { message: 'Failed to get presets' });
      }
    });

    socket.on('save-preset', async (preset) => {
      try {
        const presets = this.store.get('presets', []);
        const index = presets.findIndex(p => p.id === preset.id);
        
        if (index >= 0) {
          presets[index] = preset;
        } else {
          presets.push(preset);
        }
        
        this.store.set('presets', presets);
        this.broadcastToClients('preset-saved', preset);
        
      } catch (error) {
        socket.emit('error', { message: 'Failed to save preset' });
      }
    });

    // History requests
    socket.on('get-history', async () => {
      try {
        const history = this.store.get('renderHistory', []);
        socket.emit('render-history', history);
      } catch (error) {
        socket.emit('error', { message: 'Failed to get render history' });
      }
    });

    // Push notification token registration
    socket.on('register-push-token', async (data) => {
      try {
        console.log('📱 PUSH TOKEN REGISTRATION:');
        console.log('  - Device Name:', socket.deviceName);
        console.log('  - Device ID:', socket.deviceId);
        console.log('  - Received data:', data);
        console.log('  - Firebase initialized:', this.firebaseInitialized);
        
        this.logger.info(`Push token registration from ${socket.deviceName}`);
        
        if (!data.token) {
          console.log('❌ Token missing in registration data');
          socket.emit('error', { message: 'Invalid push token' });
          return;
        }

        console.log('✅ Valid token received:', data.token.substring(0, 20) + '...');

        // Remove any existing device IDs with the same token to prevent duplicates
        const devicesToRemove = [];
        for (const [existingDeviceId, existingToken] of this.deviceTokens.entries()) {
          if (existingToken === data.token && existingDeviceId !== socket.deviceId) {
            devicesToRemove.push(existingDeviceId);
          }
        }
        
        if (devicesToRemove.length > 0) {
          console.log(`🧹 CLEANING DUPLICATE TOKENS:`);
          for (const deviceIdToRemove of devicesToRemove) {
            this.deviceTokens.delete(deviceIdToRemove);
            console.log(`  - Removed duplicate device ID: ${deviceIdToRemove}`);
          }
          console.log(`✅ Cleaned ${devicesToRemove.length} duplicate device ID(s)`);
        }

        // Store the token for this device
        this.deviceTokens.set(socket.deviceId, data.token);
        this.saveDeviceTokens();

        console.log('💾 Token stored in memory and persisted');
        console.log('📊 Total registered tokens:', this.deviceTokens.size);
        
        // List all registered devices
        console.log('📋 All registered devices:');
        for (const [deviceId, token] of this.deviceTokens.entries()) {
          console.log(`  - ${deviceId}: ${token.substring(0, 20)}...`);
        }

        this.logger.info(`Push token registered for device ${socket.deviceName}: ${data.token.substring(0, 20)}...`);
        
        // Confirm registration
        socket.emit('push-token-registered', {
          success: true,
          deviceId: socket.deviceId
        });
        
        console.log('✅ Registration confirmation sent to mobile');
        
      } catch (error) {
        console.log('❌ Token registration FAILED!');
        console.log('🔍 Error:', error.message);
        console.log('🔍 Stack:', error.stack);
        this.logger.error(`Error registering push token: ${error.message}`);
        socket.emit('error', { message: 'Failed to register push token' });
      }
    });

    // Test push notification handler
    socket.on('test-push-notification', async (data) => {
      try {
        console.log('🧪 TEST PUSH NOTIFICATION REQUEST:');
        console.log('  - From Device:', socket.deviceName);
        console.log('  - Device ID:', socket.deviceId);
        console.log('  - Test data:', data);
        
        this.logger.info(`Test push notification request from ${socket.deviceName}`);
        
        if (!this.firebaseInitialized) {
          console.log('❌ Firebase not initialized for test');
          socket.emit('error', { message: 'Push notifications not configured' });
          return;
        }

        // Convert all data values to strings for Firebase compatibility
        console.log('🔍 TEST DATA DEBUG:');
        console.log('  - Original data.data:', data.data);
        console.log('  - data.data type:', typeof data.data);
        
        const dataPayload = {
          type: 'test',
          timestamp: Date.now().toString(),
          ...data.data
        };
        
        console.log('  - Combined payload before stringify:', dataPayload);
        
        // Ensure all values are strings
        const stringifiedData = {};
        for (const [key, value] of Object.entries(dataPayload)) {
          console.log(`    - Converting ${key}: ${value} (${typeof value}) -> ${String(value)}`);
          stringifiedData[key] = String(value);
        }
        
        console.log('  - Final stringified data:', stringifiedData);

        const testNotification = {
          title: data.title || 'Test Push Notification 🧪',
          body: data.body || 'This is a test push notification from BRS Desktop',
          data: stringifiedData
        };

        console.log('🚀 Sending test push notification...');
        
        // Send to the requesting device
        const success = await this.sendPushNotification(socket.deviceId, testNotification);
        
        if (success) {
          console.log('✅ Test push notification sent successfully');
          socket.emit('test-push-result', { 
            success: true, 
            message: 'Test push notification sent successfully' 
          });
        } else {
          console.log('❌ Failed to send test push notification');
          console.log('🔍 Checking Firebase errors in sendPushNotification logs above...');
          socket.emit('test-push-result', { 
            success: false, 
            message: 'Failed to send test push notification - check desktop console for Firebase errors',
            error: 'Push notification delivery failed'
          });
        }
        
      } catch (error) {
        console.log('❌ Test push notification FAILED!');
        console.log('🔍 Error:', error.message);
        console.log('🔍 Stack:', error.stack);
        this.logger.error(`Error sending test push notification: ${error.message}`);
        socket.emit('error', { message: 'Failed to send test push notification' });
      }
    });
  }

  validateRenderParams(data) {
    return data && 
           typeof data.command === 'string' && 
           data.command.trim().length > 0;
  }

  sendRenderStatus(socket) {
    const status = {
      isRendering: this.renderManager.hasActiveRenders(),
      activeProcesses: this.renderManager.processes.size,
      timestamp: new Date().toISOString()
    };
    
    socket.emit('render-status', status);
  }

  broadcastToClients(event, data) {
    for (const client of this.connectedClients.values()) {
      client.socket.emit(event, data);
    }
  }

  // Pairing code management
  generatePairingCode() {
    // Generate a 6-digit numeric code
    this.currentPairingCode = Math.floor(100000 + Math.random() * 900000).toString();
    this.pairingCodeExpiry = Date.now() + (5 * 60 * 1000); // 5 minutes
    
    this.logger.info(`Generated pairing code: ${this.currentPairingCode}`);
    this.emit('pairing-code-generated', this.currentPairingCode);
    
    return this.currentPairingCode;
  }

  validatePairingCode(code) {
    return this.currentPairingCode === code && Date.now() <= this.pairingCodeExpiry;
  }

  clearPairingCode() {
    this.currentPairingCode = null;
    this.pairingCodeExpiry = null;
    this.emit('pairing-code-cleared');
  }

  getPairingCode() {
    if (!this.currentPairingCode || Date.now() > this.pairingCodeExpiry) {
      return null;
    }
    return this.currentPairingCode;
  }

  // Device management
  loadPairedDevices() {
    try {
      const devices = this.store.get('pairedDevices', {});
      this.pairedDevices = new Map(Object.entries(devices));
      this.logger.info(`Loaded ${this.pairedDevices.size} paired devices`);
    } catch (error) {
      this.logger.error(`Error loading paired devices: ${error.message}`);
    }
  }

  savePairedDevices() {
    try {
      const devices = Object.fromEntries(this.pairedDevices);
      this.store.set('pairedDevices', devices);
    } catch (error) {
      this.logger.error(`Error saving paired devices: ${error.message}`);
    }
  }

  removePairedDevice(deviceId) {
    if (this.pairedDevices.has(deviceId)) {
      const deviceName = this.pairedDevices.get(deviceId).name;
      this.pairedDevices.delete(deviceId);
      this.savePairedDevices();
      
      // Disconnect any active connections for this device
      for (const [socketId, client] of this.connectedClients.entries()) {
        if (client.deviceId === deviceId) {
          client.socket.disconnect(true);
          this.connectedClients.delete(socketId);
        }
      }
      
      this.logger.info(`Removed paired device: ${deviceName} (${deviceId})`);
      this.emit('device-removed', { deviceId, deviceName });
      return true;
    }
    return false;
  }

  getPairedDevices() {
    return Array.from(this.pairedDevices.entries()).map(([id, device]) => ({
      id,
      ...device,
      isConnected: Array.from(this.connectedClients.values()).some(client => client.deviceId === id)
    }));
  }

  getConnectedDevices() {
    return Array.from(this.connectedClients.values()).map(client => ({
      deviceId: client.deviceId,
      deviceName: this.pairedDevices.get(client.deviceId)?.name || 'Unknown Device'
    }));
  }

  // Server lifecycle
  async start() {
    if (this.isRunning) {
      this.logger.warn('Server is already running');
      return;
    }

    try {
      this.setupSocketIO();
      
      await new Promise((resolve, reject) => {
        this.httpServer.listen(this.port, '0.0.0.0', (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      this.isRunning = true;
      console.log(`🎉 MOBILE COMPANION SERVER STARTED ON PORT ${this.port}`);
      console.log(`🌐 LISTENING ON: 0.0.0.0:${this.port}`);
      this.logger.info(`Mobile Companion Server started on port ${this.port}`);
      this.emit('server-started', { port: this.port });
      
    } catch (error) {
      this.logger.error(`Failed to start server: ${error.message}`);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    try {
      // Disconnect all clients
      if (this.io) {
        this.io.disconnectSockets(true);
      }

      // Close HTTP server
      if (this.httpServer) {
        await new Promise((resolve) => {
          this.httpServer.close(resolve);
        });
      }

      this.isRunning = false;
      this.connectedClients.clear();
      this.clearPairingCode();
      
      this.logger.info('Mobile Companion Server stopped');
      this.emit('server-stopped');
      
    } catch (error) {
      this.logger.error(`Error stopping server: ${error.message}`);
      throw error;
    }
  }

  getNetworkIP() {
    this.logger.info('Attempting to find network IP...');
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const results = Object.create(null);

    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          if (!results[name]) {
            results[name] = [];
          }
          results[name].push(net.address);
        }
      }
    }

    this.logger.info('Available network interfaces: ' + JSON.stringify(results, null, 2));

    const priorityInterfaces = ['Ethernet', 'Wi-Fi', 'en0', 'wlan0'];
    for (const iface of priorityInterfaces) {
      if (results[iface]) {
        this.logger.info(`Found priority interface '${iface}'. IP: ${results[iface][0]}`);
        return results[iface][0];
      }
    }
    
    this.logger.warn('No priority interface found. Falling back to the first available one.');
    
    const firstInterface = Object.keys(results)[0];
    if (firstInterface) {
      this.logger.info(`Using fallback interface '${firstInterface}'. IP: ${results[firstInterface][0]}`);
      return results[firstInterface][0];
    }

    this.logger.error('No suitable network interface found. Defaulting to 127.0.0.1.');
    return '127.0.0.1';
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.port,
      connectedDevices: this.getConnectedDevices().length,
      pairedDevices: this.pairedDevices.size,
      currentPairingCode: this.getPairingCode(),
      networkIP: this.getNetworkIP()
    };
  }
}

module.exports = MobileCompanionServer;