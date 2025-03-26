const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron/main')
const path = require('path')
const fs = require('fs')

// Determina se siamo in modalità sviluppo
// Verifica se esiste la cartella di build o se è stato esplicitamente impostato NODE_ENV
const isDev = !fs.existsSync(path.join(__dirname, 'dist', 'index.html')) || 
              process.env.NODE_ENV === 'development'

// Handle Squirrel startup events
if (require('electron-squirrel-startup')) {
  app.quit()
}

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

let mainWindow = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#131211'
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    // In production, load from the asar archive
    mainWindow.loadFile(path.join(__dirname, 'out', 'index.html'))
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
    // Forward the PID to the renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('process:started', pid);
    }
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
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

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
