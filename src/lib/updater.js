const { autoUpdater } = require('electron-updater');
const { BrowserWindow, ipcMain, dialog } = require('electron');

class UpdateManager {
    constructor(window) {
        this.mainWindow = window;
        this.initialize();
    }

    initialize() {
        autoUpdater.checkForUpdates();

        autoUpdater.on('update-available', (info) => {
            dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'Update Available',
                message: `Version ${info.version} is available`,
                detail: info.releaseNotes?.toString() || 'No release notes available',
                buttons: ['Update now', 'Later'],
                cancelId: 1
            }).then(({ response }) => {
                if (response === 0) {
                    autoUpdater.downloadUpdate();
                }
            });
        });

        autoUpdater.on('download-progress', (progress) => {
            this.mainWindow.webContents.send('update-progress', {
                percent: progress.percent
            });
        });

        autoUpdater.on('update-downloaded', () => {
            dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'Update Ready',
                message: 'Update has been downloaded and will be installed on restart',
                buttons: ['Restart now', 'Later'],
                cancelId: 1
            }).then(({ response }) => {
                if (response === 0) {
                    autoUpdater.quitAndInstall();
                }
            });
        });

        autoUpdater.on('error', (err) => {
            dialog.showErrorBox('Update Error', 
                `An error occurred while updating: ${err.message}`);
        });

        ipcMain.handle('check-for-updates', () => {
            return autoUpdater.checkForUpdates();
        });
    }
}

module.exports = { UpdateManager };