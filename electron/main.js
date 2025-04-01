const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const os = require('os');
const RenderManager = require('./renderManager');

// Determina se siamo in modalità sviluppo basandoci sul percorso di esecuzione
const isDevelopment = app.isPackaged === false;

// Aggiungi il reloader in modalità sviluppo
if (isDevelopment) {
  try {
    require('electron-reloader')(module, {
      debug: true,
      watchRenderer: true,
      ignore: [
        'node_modules/**/*',
        'src/**/*',
        'build/**/*',
        'dist/**/*',
        '.next/**/*',
        'public/**/*'
      ],
      watch: [
        path.join(__dirname, '*.js'),
        path.join(__dirname, '*.json')
      ]
    });
  } catch (_) { console.log('Error'); }
}

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

const defaultPreset = {
  id: 'default',
  name: 'default',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  parameters: {
  blenderPath: '',
  blendFile: '',
  outputDir: '',
  resolution: {
    width: 1920,
    height: 1080
  },
  frameRange: {
    start: 1,
    end: 1
  },
    outputFormat: 'PNG'
  },
  metadata: {
    lastUsed: new Date().toISOString()
  }
};

// Inizializza lo store
const store = new Store();

// Inizializza i valori predefiniti se non esistono
if (!store.has('presets')) {
  store.set('presets', [defaultPreset]);
}
if (!store.has('defaultPreset')) {
  store.set('defaultPreset', 'default');
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 850,
    minWidth: 1440,
    minHeight: 850,
    icon: path.join(__dirname, '../public/app_icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: true
    },
    backgroundColor: '#131211',
    autoHideMenuBar: true,
  });

  // Abilita il drag and drop dei file
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  // Carica l'app in base all'ambiente
  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In produzione, carica i file statici
    const indexPath = path.join(__dirname, '../out/index.html');
    console.log('Tentativo di caricamento da:', indexPath);
    console.log('isDevelopment:', isDevelopment);

    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
      console.log('File index.html trovato e caricato');
    } else {
      console.error('File index.html non trovato in:', indexPath);
      mainWindow.loadURL('about:blank');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Registra l'handler per execute-command
  ipcMain.handle('execute-command', async (event, command) => {
    try {
      const result = await renderManager.executeCommand(command);
      return { success: true, result };
    } catch (error) {
      console.error('Errore nell\'esecuzione del comando:', error);
      return { success: false, error: error.message };
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// File system operations
ipcMain.handle('open-file-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result.filePaths;
});

ipcMain.handle('open-directory', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    ...options,
    properties: ['openDirectory']
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('open-path', async (event, dirPath) => {
  try {
      await shell.openPath(dirPath);
      return true;
  } catch (error) {
    console.error('Error opening path:', error);
    return false;
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    return data;
  } catch (error) {
    console.error('Error reading file:', error);
    return null;
  }
});

ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    await fs.promises.writeFile(filePath, data, 'utf8');
  } catch (error) {
    console.error('Error writing file:', error);
    throw error;
  }
});

ipcMain.handle('get-app-data-path', () => {
  switch (process.platform) {
    case 'win32':
      return path.join(os.homedir(), 'AppData', 'Roaming', 'BlenderRenderSuite');
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', 'BlenderRenderSuite');
    default:
      return path.join(os.homedir(), '.config', 'blender-render-suite');
  }
});

// Gestori IPC per i preset
ipcMain.handle('getAllPresets', async () => {
  try {
    const presets = store.get('presets', []);
    return presets;
  } catch (error) {
    console.error('Error getting presets:', error);
    return [];
  }
});

ipcMain.handle('getPreset', async (_, id) => {
  try {
    const presets = store.get('presets', []);
    const preset = presets.find(p => p.id === id);
    return preset || null;
  } catch (error) {
    console.error('Error getting preset:', error);
    return null;
  }
});

ipcMain.handle('savePreset', async (_, preset) => {
  try {
    const presets = store.get('presets', []);
    const index = presets.findIndex(p => p.id === preset.id);

    if (index >= 0) {
      presets[index] = preset;
    } else {
      presets.push(preset);
    }

  store.set('presets', presets);
  return true;
  } catch (error) {
    console.error('Error saving preset:', error);
    return false;
  }
});

ipcMain.handle('deletePreset', async (_, id) => {
  try {
    const presets = store.get('presets', []);
    const filteredPresets = presets.filter(p => p.id !== id);
    store.set('presets', filteredPresets);
    return true;
  } catch (error) {
    console.error('Error deleting preset:', error);
    return false;
  }
});

ipcMain.handle('renamePreset', async (_, id, newName) => {
  try {
    const presets = store.get('presets', []);
    const preset = presets.find(p => p.id === id);

    if (!preset) return false;

    preset.name = newName;
    preset.updatedAt = new Date().toISOString();

  store.set('presets', presets);
    return true;
  } catch (error) {
    console.error('Error renaming preset:', error);
    return false;
  }
});

// Funzione di validazione preset
function validatePreset(preset) {
  // Verifica solo i campi essenziali
  if (!preset || typeof preset !== 'object') {
    throw new Error('Invalid preset format');
  }

  // Verifica i campi obbligatori
  if (!preset.id || typeof preset.id !== 'string') {
    throw new Error('Missing or invalid preset ID');
  }
  if (!preset.name || typeof preset.name !== 'string') {
    throw new Error('Missing or invalid preset name');
  }
  if (!preset.version || typeof preset.version !== 'string') {
    throw new Error('Missing or invalid version');
  }
  if (!preset.createdAt || typeof preset.createdAt !== 'string') {
    throw new Error('Missing or invalid creation date');
  }
  if (!preset.updatedAt || typeof preset.updatedAt !== 'string') {
    throw new Error('Missing or invalid update date');
  }

  // Verifica che parameters sia un oggetto (se presente)
  if (preset.parameters && typeof preset.parameters !== 'object') {
    throw new Error('Parameters must be an object');
  }

  // Verifica che metadata sia un oggetto (se presente)
  if (preset.metadata && typeof preset.metadata !== 'object') {
    throw new Error('Metadata must be an object');
  }

  return true;
}

// Modifico l'handler importPresets per usare direttamente il preset importato
ipcMain.handle('importPresets', async (event, filePath) => {
  try {
    if (!filePath) {
      console.error('No file path provided');
      return {
        success: false,
        message: 'No file path provided'
      };
    }

    console.log('Importing presets from:', filePath);
    const fileContent = await fs.promises.readFile(filePath, 'utf8');
    console.log('File content read successfully');

    const preset = JSON.parse(fileContent);
    console.log('Parsed preset:', preset);

    // Valida il preset
    validatePreset(preset);
    console.log('Preset validation passed');

    // Verifica se esiste già un preset con lo stesso nome
    const existingPresets = store.get('presets', []);
    console.log('Current presets:', existingPresets);
    const existingPreset = existingPresets.find(p => p.name === preset.name);

    if (existingPreset) {
      // Se esiste, aggiungi un timestamp al nome
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      preset.name = `${preset.name}_${timestamp}`;
      console.log('Renamed preset to:', preset.name);
    }

    // Aggiungi il preset alla lista
    existingPresets.push(preset);
    console.log('Saving presets:', existingPresets);
    store.set('presets', existingPresets);

    // Verifica che sia stato salvato
    const savedPresets = store.get('presets', []);
    console.log('Verified saved presets:', savedPresets);

    console.log('Preset imported successfully');
    return { success: true };
  } catch (error) {
    console.error('Error importing preset:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to import preset'
    };
  }
});

// Funzione per verificare se un percorso è un eseguibile Blender valido
async function isValidBlenderExecutable(executablePath) {
  try {
    // Verifica che il file esista
    if (!fs.existsSync(executablePath)) {
      return false;
    }

    // Verifica che sia un file eseguibile
    if (os.platform() === 'win32') {
      return executablePath.toLowerCase().endsWith('.exe');
    } else if (os.platform() === 'darwin') {
      return executablePath.toLowerCase().endsWith('.app');
    } else {
      // Linux
      const stats = fs.statSync(executablePath);
      return stats.isFile() && (stats.mode & fs.constants.S_IXUSR);
    }
  } catch (error) {
    console.error('Error checking Blender executable:', error);
    return false;
  }
}

// Funzione per cercare Blender nelle posizioni standard
async function findBlenderInStandardLocations() {
  const versions = [];

  if (os.platform() === 'win32') {
    // Windows
    const programFiles = process.env['ProgramFiles'];
    const programFilesX86 = process.env['ProgramFiles(x86)'];
    const localAppData = process.env['LOCALAPPDATA'];

    // Funzione per cercare in una directory
    const searchInDirectory = async (baseDir) => {
      try {
        if (!fs.existsSync(baseDir)) return [];

        const blenderDir = path.join(baseDir, 'Blender Foundation');
        if (!fs.existsSync(blenderDir)) return [];

        const entries = await fs.promises.readdir(blenderDir);
        const blenderVersions = entries.filter(entry => entry.startsWith('Blender'));

        for (const version of blenderVersions) {
          const blenderPath = path.join(blenderDir, version, 'blender.exe');
          if (await isValidBlenderExecutable(blenderPath)) {
            versions.push({
              path: blenderPath,
              version: version.replace('Blender ', '')
            });
          }
        }
      } catch (error) {
        console.error('Error searching in directory:', error);
      }
    };

    // Cerca in Program Files
    if (programFiles) {
      await searchInDirectory(programFiles);
    }

    // Cerca in Program Files (x86)
    if (programFilesX86) {
      await searchInDirectory(programFilesX86);
    }

    // Cerca in AppData locale
    if (localAppData) {
      const blenderDir = path.join(localAppData, 'Programs', 'Blender');
      if (fs.existsSync(blenderDir)) {
        const entries = await fs.promises.readdir(blenderDir);
        for (const entry of entries) {
          const blenderPath = path.join(blenderDir, entry, 'blender.exe');
          if (await isValidBlenderExecutable(blenderPath)) {
            versions.push({
              path: blenderPath,
              version: entry
            });
          }
        }
      }
    }
  } else if (os.platform() === 'darwin') {
    // macOS
    const searchPaths = [
      '/Applications',
      path.join(os.homedir(), 'Applications')
    ];

    for (const basePath of searchPaths) {
      try {
        if (!fs.existsSync(basePath)) continue;

        const entries = await fs.promises.readdir(basePath);
        const blenderApps = entries.filter(entry => entry.startsWith('Blender'));

        for (const app of blenderApps) {
          const blenderPath = path.join(basePath, app, 'Contents', 'MacOS', 'Blender');
          if (await isValidBlenderExecutable(blenderPath)) {
            versions.push({
              path: blenderPath,
              version: app.replace('Blender', '').trim()
            });
          }
        }
      } catch (error) {
        console.error('Error searching in directory:', error);
      }
    }
  } else {
    // Linux
    const searchPaths = [
      '/usr/bin',
      '/usr/local/bin',
      path.join(os.homedir(), '.local/bin')
    ];

    // Prima cerca nei percorsi standard
    for (const searchPath of searchPaths) {
      const blenderPath = path.join(searchPath, 'blender');
      if (await isValidBlenderExecutable(blenderPath)) {
        versions.push({
          path: blenderPath,
          version: 'System'
        });
      }
    }

    // Poi cerca in /opt
    try {
      if (fs.existsSync('/opt')) {
        const entries = await fs.promises.readdir('/opt');
        const blenderDirs = entries.filter(entry => entry.startsWith('blender'));

        for (const dir of blenderDirs) {
          const blenderPath = path.join('/opt', dir, 'blender');
          if (await isValidBlenderExecutable(blenderPath)) {
            versions.push({
              path: blenderPath,
              version: dir.replace('blender', '').trim()
            });
          }
        }
      }
    } catch (error) {
      console.error('Error searching in /opt:', error);
    }
  }

  return versions;
}

// Handler per il rilevamento automatico di Blender
ipcMain.handle('detect-blender', async () => {
  try {
    const versions = await findBlenderInStandardLocations();
    return versions;
  } catch (error) {
    console.error('Error detecting Blender:', error);
    return [];
  }
});

// Blender info handlers
ipcMain.handle('get-blender-version', async () => {
  try {
    const presets = store.get('presets', []);
    const defaultPresetId = store.get('defaultPreset', 'default');
    const defaultPreset = presets.find(p => p.id === defaultPresetId);

    if (!defaultPreset) return 'Unknown';

    return defaultPreset.parameters.blenderPath ?
      await renderManager.getBlenderVersion(defaultPreset.parameters.blenderPath) :
      'Unknown';
  } catch (error) {
    console.error('Error getting Blender version:', error);
    return 'Unknown';
  }
});

ipcMain.handle('get-render-engine', async () => {
  try {
    const presets = store.get('presets', []);
    const defaultPresetId = store.get('defaultPreset', 'default');
    const defaultPreset = presets.find(p => p.id === defaultPresetId);

    if (!defaultPreset) return 'Unknown';

    return defaultPreset.parameters.renderEngine || 'Unknown';
  } catch (error) {
    console.error('Error getting render engine:', error);
    return 'Unknown';
  }
});

ipcMain.handle('get-output-path', async () => {
  try {
    const presets = store.get('presets', []);
    const defaultPresetId = store.get('defaultPreset', 'default');
    const defaultPreset = presets.find(p => p.id === defaultPresetId);

    if (!defaultPreset) return '';

    return defaultPreset.parameters.outputDir || '';
  } catch (error) {
    console.error('Error getting output path:', error);
    return '';
  }
});

// Aggiungi questi handler IPC
ipcMain.handle('save-history', (event, history) => {
    try {
        store.set('renderHistory', history);
        return true;
    } catch (error) {
        console.error('Error saving history:', error);
        return false;
    }
});

ipcMain.handle('load-history', () => {
    try {
        return store.get('renderHistory', []);
    } catch (error) {
        console.error('Error loading history:', error);
        return [];
    }
});

// Aggiungi questo handler
ipcMain.handle('show-directory-picker', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Installation Directory'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  } catch (error) {
    console.error('Error showing directory picker:', error);
    return null;
  }
});

// Inizializza il renderManager
const renderManager = new RenderManager();
