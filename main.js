const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Determina se siamo in modalità sviluppo
const isDev = process.env.NODE_ENV === 'development'

// Handle Squirrel startup events
if (require('electron-squirrel-startup')) {
  app.quit()
}

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

let mainWindow = null;
let splashScreen = null;
let childProcesses = new Set();

// Funzione per ottenere il percorso base dei file statici
function getStaticBasePath() {
  if (isDev) {
    return path.join(__dirname, 'dist')
  }

  // In production, prova diversi percorsi possibili
  const possiblePaths = [
    path.join(process.resourcesPath, 'app.asar.unpacked', 'dist'),
    path.join(app.getAppPath(), 'dist'),
    path.join(__dirname, 'dist'),
    path.join(app.getPath('exe'), '..', 'resources', 'app.asar.unpacked', 'dist')
  ]

  for (const testPath of possiblePaths) {
    console.log(`Testing static path: ${testPath}`)
    if (fs.existsSync(testPath)) {
      console.log(`Found valid static path: ${testPath}`)
      return testPath
    }
  }

  console.error('No valid static path found! Tested paths:', possiblePaths)
  return possiblePaths[0] // Fallback al primo percorso
}

// Funzione per la pulizia dei processi
function cleanupProcesses() {
  for (let pid of childProcesses) {
    try {
      process.kill(pid);
    } catch (error) {
      console.error(`Failed to kill process ${pid}:`, error);
    }
  }
  childProcesses.clear();
}

// Funzione per rilevare le versioni di Blender installate
async function detectBlenderVersions() {
  // Ritorna array vuoto se non siamo su Windows
  if (process.platform !== 'win32') {
    console.log('Automatic Blender detection is only supported on Windows');
    return [];
  }

  const BLENDER_BASE_PATH = 'C:\\Program Files\\Blender Foundation';

  try {
    console.log('Checking Blender installation at:', BLENDER_BASE_PATH);

    if (!fs.existsSync(BLENDER_BASE_PATH)) {
      console.log('Blender base directory not found at:', BLENDER_BASE_PATH);
      return [];
    }

    const dirs = fs.readdirSync(BLENDER_BASE_PATH);
    console.log('Found directories:', dirs);

    const blenderDirs = dirs.filter(dir => {
      const isBlenderDir = dir.startsWith('Blender') &&
        fs.statSync(path.join(BLENDER_BASE_PATH, dir)).isDirectory();
      return isBlenderDir;
    });

    const versions = blenderDirs.map(dir => {
      const execPath = path.join(BLENDER_BASE_PATH, dir, 'blender.exe');

      if (!fs.existsSync(execPath)) {
        return null;
      }

      const version = dir.replace('Blender ', '');

      return {
        version,
        path: path.join(BLENDER_BASE_PATH, dir),
        executablePath: execPath
      };
    }).filter(v => v !== null);

    return versions.sort((a, b) =>
      b.version.localeCompare(a.version, undefined, { numeric: true })
    );
  } catch (error) {
    console.error('Error detecting Blender versions:', error);
    return [];
  }
}

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 800,
    minWidth: 1200,
    minHeight: 700,
    icon: path.join(__dirname, 'assets', 'icons', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      webSecurity: true
    },
    backgroundColor: '#131211',
    autoHideMenuBar: true,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    // mainWindow.webContents.openDevTools()

    // Abilita il refresh automatico in development
    mainWindow.webContents.on('did-fail-load', () => {
      mainWindow.loadURL('http://localhost:3000')
    })

    // Gestisci il reload quando Next.js ha finito di compilare
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
    })
  } else {
    // In production, carica l'HTML dalla cartella dist
    const staticBasePath = getStaticBasePath()
    console.log('Using static base path:', staticBasePath)

    const indexPath = path.join(staticBasePath, 'index.html')
    console.log('Loading index from:', indexPath)

    if (!fs.existsSync(indexPath)) {
      console.error('index.html not found at:', indexPath)
      app.quit()
      return
    }

    // Carica direttamente il file HTML
    mainWindow.loadFile(indexPath)
  }

  // Handle IPC events
  ipcMain.on('process:output', (event, line) => {
    // Forward the output to the renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('process:output', line);
    }
  });

  // Handle process started event
  ipcMain.on('process:started', (event, pid) => {
    console.log(`Main process received process:started with PID: ${pid}`);
    childProcesses.add(pid);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('process:started', pid);
    }
  });

  ipcMain.on('process:ended', (event, pid) => {
    childProcesses.delete(pid);
  });

  mainWindow.on('closed', () => {
    cleanupProcesses();
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  cleanupProcesses();
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  cleanupProcesses();
});

// Handle file dialogs
ipcMain.handle('dialog:openFile', async (event, options) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(options)
  if (!canceled) {
    return filePaths[0]
  }
})

ipcMain.handle('dialog:openDirectory', async (event, options) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    ...options,
    properties: ['openDirectory']
  })
  if (!canceled) {
    return filePaths[0]
  }
})

// Handle shell.openPath to open a path directly in the file explorer
ipcMain.handle('shell:openPath', async (event, dirPath) => {
  try {
    // Make sure the directory exists before trying to open it
    if (fs.existsSync(dirPath)) {
      await shell.openPath(dirPath)
      return true
    }
    return false
  } catch (error) {
    console.error('Error opening path:', error)
    return false
  }
})

// Handle file system operations
ipcMain.handle('fs:readFile', async (event, filePath) => {
  try {
    return await fs.promises.readFile(filePath, 'utf-8')
  } catch (error) {
    console.error('Error reading file:', error)
    return null
  }
})

ipcMain.handle('fs:writeFile', async (event, filePath, data) => {
  try {
    await fs.promises.writeFile(filePath, data, 'utf-8')
  } catch (error) {
    console.error('Error writing file:', error)
    throw error
  }
})

ipcMain.handle('fs:exists', async (event, path) => {
  try {
    return fs.existsSync(path)
  } catch (error) {
    console.error('Error checking file existence:', error)
    return false
  }
})

ipcMain.handle('fs:mkdir', async (event, path) => {
  try {
    await fs.promises.mkdir(path, { recursive: true })
  } catch (error) {
    console.error('Error creating directory:', error)
    throw error
  }
})

// IPC handler per il rilevamento delle versioni di Blender
ipcMain.handle('blender:detect-versions', detectBlenderVersions);
