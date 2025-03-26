// Importo i moduli necessari all'inizio del file, assicurandomi che vengano caricati correttamente
const { contextBridge, ipcRenderer } = require('electron')
const childProcess = require('child_process')
const { execFile, exec } = childProcess
const os = require('os')
const path = require('path')
const fs = require('fs')

// Create a map to store running processes
const runningProcesses = new Map()

// Helper function to kill a process tree (Windows-specific)
async function killProcessTree(pid) {
  console.log(`killProcessTree chiamata con PID: ${pid}`);
  
  if (process.platform === 'win32') {
    try {
      console.log(`Esecuzione taskkill su PID: ${pid}`);
      // On Windows, use taskkill to kill the process tree
      const { execSync } = require('child_process')
      const command = `taskkill /pid ${pid} /T /F`;
      console.log(`Comando: ${command}`);
      
      try {
        execSync(command);
        console.log(`taskkill eseguito con successo per PID: ${pid}`);
        return true;
      } catch (error) {
        console.error(`Errore nell'esecuzione di taskkill: ${error.message}`);
        console.error(`stdout: ${error.stdout?.toString()}`);
        console.error(`stderr: ${error.stderr?.toString()}`);
        return false;
      }
    } catch (error) {
      console.error('Errore generale nel killProcessTree:', error);
      return false;
    }
  } else {
    // On Unix-like systems, try SIGTERM first then SIGKILL
    try {
      const proc = runningProcesses.get(pid);
      console.log(`Processo recuperato dalla mappa:`, proc ? "sì" : "no");
      
      if (!proc) return false;
      
      console.log(`Invio segnale SIGTERM al processo PID: ${pid}`);
      proc.kill('SIGTERM');
      
      // Give it a moment to terminate gracefully
      console.log(`Attesa per terminazione graceful...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // If still running, force kill
      if (proc.killed) {
        console.log(`Processo terminato con SIGTERM`);
        return true;
      }
      
      console.log(`SIGTERM fallito, tentativo con SIGKILL`);
      proc.kill('SIGKILL');
      return true;
    } catch (error) {
      console.error('Error killing process:', error);
      return false;
    }
  }
}

// Expose ipcRenderer methods needed by the app
contextBridge.exposeInMainWorld('ipcRenderer', {
  on: (channel, listener) => ipcRenderer.on(channel, listener),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Handle process execution
function executeProcess(command, args) {
  return new Promise((resolve, reject) => {
    // On Windows, we need to handle paths properly
    if (process.platform === 'win32') {
      // Remove any existing quotes from the command
      command = command.replace(/^"+|"+$/g, '');
    }

    // Handle paths with spaces in arguments
    args = args.map(arg => {
      // Remove any existing quotes
      arg = arg.replace(/^"+|"+$/g, '');
      return arg;
    });

    console.log(`Executing command: ${command} ${args.join(' ')}`);
    
    let stdout = '';
    let stderr = '';
    const proc = execFile(command, args);
    
    // Store PID immediately
    const pid = proc.pid;
    console.log(`Process started with PID: ${pid}`);

    // Send PID to renderer immediately via IPC
    if (pid) {
      console.log(`Sending process:started event with PID: ${pid}`);
      ipcRenderer.send('process:started', pid);
    }

    // Store the process
    if (pid) {
      console.log(`Storing process in runningProcesses map with PID: ${pid}`);
      runningProcesses.set(pid, proc);
    } else {
      console.warn('Process started but no PID was assigned');
    }

    // Line buffer for stdout
    let stdoutBuffer = '';
    proc.stdout.on('data', (data) => {
      stdout += data;
      
      // Process the output line by line
      stdoutBuffer += data;
      const lines = stdoutBuffer.split('\n');
      // Keep the last partial line in the buffer
      stdoutBuffer = lines.pop() || '';
      
      // Emit each complete line
      for (const line of lines) {
        if (line.trim()) {
          // Send line to renderer through main process
          ipcRenderer.send('process:output', line.trim());
        }
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data;
    });

    proc.on('close', (code) => {
      console.log(`Process exited with code: ${code}, PID was: ${proc.pid}`);
      
      // Process any remaining data in the buffer
      if (stdoutBuffer.trim()) {
        ipcRenderer.send('process:output', stdoutBuffer.trim());
      }

      // Clean up the process
      if (proc.pid) {
        runningProcesses.delete(proc.pid);
      }
      
      // Return the process info so we can stop it later if needed
      resolve({ 
        code, 
        stdout, 
        stderr, 
        pid: pid  // Return pid directly instead of nested object
      });
    });

    proc.on('error', (err) => {
      console.error(`Process error: ${err.message} for PID: ${proc.pid}`);
      // Clean up on error
      if (proc.pid) {
        runningProcesses.delete(proc.pid);
      }
      reject(err);
    });
  });
}

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  
  // File system operations
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  openDirectory: (options) => ipcRenderer.invoke('dialog:openDirectory', options),
  openPath: (dirPath) => ipcRenderer.invoke('shell:openPath', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
  exists: (path) => ipcRenderer.invoke('fs:exists', path),
  mkdir: (path) => ipcRenderer.invoke('fs:mkdir', path),
  
  // Process execution
  execute: async (command, args) => {
    try {
      const result = await executeProcess(command, args);
      return {
        code: result.code,
        stdout: result.stdout,
        stderr: result.stderr,
        pid: result.pid // Return the PID directly
      };
    } catch (error) {
      console.error('Process execution error:', error);
      throw error;
    }
  },

  // Application data path
  getAppDataPath: () => {
    switch (process.platform) {
      case 'win32':
        return path.join(os.homedir(), 'AppData', 'Roaming', 'BlenderRenderSuite')
      case 'darwin':
        return path.join(os.homedir(), 'Library', 'Application Support', 'BlenderRenderSuite')
      default:
        return path.join(os.homedir(), '.config', 'blender-render-suite')
    }
  },

  // Process management
  killProcess: async (pid) => {
    console.log(`killProcess chiamato con PID: ${pid}`);
    
    if (!pid) {
      console.error('PID non valido');
      return false;
    }
    
    try {
      if (process.platform === 'win32') {
        // Metodo diretto per Windows: usare execSync direttamente qui
        const { execSync } = require('child_process');
        try {
          console.log(`Esecuzione comando: taskkill /pid ${pid} /T /F`);
          execSync(`taskkill /pid ${pid} /T /F`, { encoding: 'utf8' });
          // Notifica al main process che il processo è terminato
          ipcRenderer.send('process:ended', pid);
          console.log('Processo terminato con successo');
          return true;
        } catch (error) {
          console.error(`Errore nell'esecuzione di taskkill:`, error);
          return false;
        }
      } else {
        const proc = runningProcesses.get(parseInt(pid));
        if (proc) {
          proc.kill('SIGKILL'); // Più aggressivo di SIGTERM
          // Notifica al main process che il processo è terminato
          ipcRenderer.send('process:ended', pid);
          console.log('Processo kill(SIGKILL) chiamato');
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error('Errore fatale in killProcess:', error);
      return false;
    }
  },

  // Log management
  writeLogs: async (logPath, content) => {
    try {
      // Make sure the directory exists
      const dir = path.dirname(logPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // Append to the log file
      await fs.promises.appendFile(logPath, content + '\n')
      return true
    } catch (error) {
      console.error('Error writing logs:', error)
      return false
    }
  },

  getSystemMemory: () => {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    return {
        total: formatBytes(totalMemory),
        used: formatBytes(usedMemory),
        free: formatBytes(freeMemory)
    };
  },

  getSystemUsage: () => {
    return new Promise((resolve) => {
      const cpuInfo = getCPUInfo();
      const currentCPUUsage = cpuInfo.cores.reduce((acc, core) => {
        Object.keys(core.times).forEach(type => {
          acc[type] = (acc[type] || 0) + core.times[type];
        });
        return acc;
      }, {});
      
      // Calculate average CPU usage across all cores
      const cpuUsage = lastCPUUsage 
        ? calculateCPUUsage(lastCPUUsage, currentCPUUsage)
        : cpuInfo.cores.reduce((acc, core) => acc + core.usage, 0) / cpuInfo.count;
      
      lastCPUUsage = currentCPUUsage;

      // Get detailed GPU info
      if (process.platform === 'win32') {
        exec('nvidia-smi --query-gpu=gpu_name,utilization.gpu,utilization.memory,memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits', (error, stdout) => {
          if (error) {
            resolve({
              cpu: Math.round(cpuUsage * 10) / 10,
              cpuModel: cpuInfo.model,
              cpuCount: cpuInfo.count,
              cpuPerCore: cpuInfo.cores.map(core => Math.round(core.usage * 10) / 10),
              gpu: null,
              gpuModel: null,
              gpuDetails: null
            });
          } else {
            const [gpuModel, gpuUtil, memUtil, memUsed, memTotal, temp] = stdout.trim().split(', ');
            resolve({
              cpu: Math.round(cpuUsage * 10) / 10,
              cpuModel: cpuInfo.model,
              cpuCount: cpuInfo.count,
              cpuPerCore: cpuInfo.cores.map(core => Math.round(core.usage * 10) / 10),
              gpu: parseFloat(gpuUtil),
              gpuModel,
              gpuDetails: {
                memoryUtilization: parseFloat(memUtil),
                memoryUsed: parseFloat(memUsed),
                memoryTotal: parseFloat(memTotal),
                temperature: parseFloat(temp)
              }
            });
          }
        });
      } else {
        resolve({
          cpu: Math.round(cpuUsage * 10) / 10,
          cpuModel: cpuInfo.model,
          cpuCount: cpuInfo.count,
          cpuPerCore: cpuInfo.cores.map(core => Math.round(core.usage * 10) / 10),
          gpu: null,
          gpuModel: null,
          gpuDetails: null
        });
      }
    });
  },

  updates: {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
    onUpdateProgress: (callback) => ipcRenderer.on('update-progress', callback),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
    removeUpdateListeners: () => {
        ipcRenderer.removeAllListeners('update-available')
        ipcRenderer.removeAllListeners('update-progress')
        ipcRenderer.removeAllListeners('update-downloaded')
    }
  },

  updater: {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    onUpdateProgress: (callback) => ipcRenderer.on('update-progress', callback),
    removeUpdateListeners: () => {
        ipcRenderer.removeAllListeners('update-progress')
    }
  }
});

// CPU usage tracking
let lastCPUUsage = null;
let lastCoreUsages = [];

function getCPUInfo() {
  const cpus = os.cpus();
  const currentCoreUsages = cpus.map(cpu => cpu.times);
  
  // Calculate per-core usage
  const coreUsages = cpus.map((cpu, index) => {
    const prevTimes = lastCoreUsages[index];
    if (!prevTimes) {
      lastCoreUsages[index] = cpu.times;
      return {
        usage: 0,
        times: cpu.times
      };
    }

    const currentTimes = cpu.times;
    const timeDiffs = {};
    let totalDiff = 0;

    // Calculate time differences for each state
    Object.keys(currentTimes).forEach(state => {
      timeDiffs[state] = currentTimes[state] - prevTimes[state];
      totalDiff += timeDiffs[state];
    });

    // Calculate idle difference
    const idleDiff = timeDiffs.idle || 0;
    
    // Update last measurements
    lastCoreUsages[index] = currentTimes;

    // Calculate usage percentage
    const usage = totalDiff === 0 ? 0 : 100 - (idleDiff / totalDiff * 100);
    
    return {
      usage: Math.max(0, Math.min(100, usage)), // Ensure value is between 0-100
      times: cpu.times
    };
  });

  return {
    model: cpus[0].model.trim(),
    count: cpus.length,
    cores: coreUsages
  };
}

function calculateCPUUsage(prevUsage, currentUsage) {
  if (!prevUsage) return null;
  
  const timeDiffs = {};
  let totalDiff = 0;

  // Calculate differences for all CPU states
  Object.keys(currentUsage).forEach(state => {
    timeDiffs[state] = currentUsage[state] - prevUsage[state];
    totalDiff += timeDiffs[state];
  });

  // Calculate idle difference
  const idleDiff = timeDiffs.idle || 0;
  
  // Calculate usage percentage
  const usage = totalDiff === 0 ? 0 : 100 - (idleDiff / totalDiff * 100);
  
  return Math.max(0, Math.min(100, usage)); // Ensure value is between 0-100
}

// Utility function to format bytes into human readable format
function formatBytes(bytes) {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${Math.round(gb * 10) / 10}GB`;
}