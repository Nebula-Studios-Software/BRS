const { contextBridge, ipcRenderer } = require('electron');
const { execSync } = require('child_process');

console.log('Preload script is running');

// Create a map to store running processes
const runningProcesses = new Map();

// Helper function to kill a process tree (Windows-specific)
async function killProcessTree(pid) {
  console.log(`killProcessTree chiamata con PID: ${pid}`);

  if (process.platform === 'win32') {
    try {
      console.log(`Esecuzione taskkill su PID: ${pid}`);
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
    try {
      const proc = runningProcesses.get(pid);
      console.log(`Processo recuperato dalla mappa:`, proc ? "sì" : "no");

      if (!proc) return false;

      console.log(`Invio segnale SIGTERM al processo PID: ${pid}`);
      proc.kill('SIGTERM');

      await new Promise(resolve => setTimeout(resolve, 1000));

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

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // File system operations
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  openDirectory: (options) => ipcRenderer.invoke('open-directory', options),
  openPath: (dirPath) => ipcRenderer.invoke('open-path', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),

  // Application data path
  getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),

  // Preset management
  getAllPresets: () => ipcRenderer.invoke('getAllPresets'),
  getPreset: (id) => ipcRenderer.invoke('getPreset', id),
  savePreset: (preset) => ipcRenderer.invoke('savePreset', preset),
  deletePreset: (id) => ipcRenderer.invoke('deletePreset', id),
  renamePreset: (oldName, newName) => ipcRenderer.invoke('renamePreset', oldName, newName),
  importPresets: (filePath) => ipcRenderer.invoke('importPresets', filePath),
  detectBlender: () => ipcRenderer.invoke('detect-blender'),

  // Render management
  executeCommand: (command) => ipcRenderer.invoke('executeCommand', command),
  stopProcess: async (id) => {
    const success = await killProcessTree(id);
    if (success) {
      runningProcesses.delete(id);
    }
    return success;
  },
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  storeProcess: (pid, process) => runningProcesses.set(pid, process),
  startSystemMonitor: () => ipcRenderer.invoke('start-system-monitor'),
  stopSystemMonitor: () => ipcRenderer.invoke('stop-system-monitor'),
  showDirectoryPicker: () => ipcRenderer.invoke('show-directory-picker'),
  saveHistory: (history) => ipcRenderer.invoke('save-history', history),
  loadHistory: () => ipcRenderer.invoke('load-history')
});

console.log('Electron API exposed to window');

// Abilita il drag and drop dei file
window.addEventListener('dragover', (event) => {
  event.preventDefault();
  event.stopPropagation();
});

window.addEventListener('drop', (event) => {
  event.preventDefault();
  event.stopPropagation();
});
