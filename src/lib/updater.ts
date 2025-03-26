import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain, dialog } from 'electron';

export class UpdateManager {
    private mainWindow: BrowserWindow;

    constructor(window: BrowserWindow) {
        this.mainWindow = window;
        this.initialize();
    }

    private initialize() {
        // Controlla gli aggiornamenti all'avvio
        autoUpdater.checkForUpdates();

        // Eventi dell'updater
        autoUpdater.on('update-available', (info) => {
            dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'Aggiornamento Disponibile',
                message: `È disponibile la versione ${info.version}`,
                detail: info.releaseNotes?.toString() || 'Nessuna nota di rilascio disponibile',
                buttons: ['Aggiorna ora', 'Più tardi'],
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
                title: 'Aggiornamento Pronto',
                message: 'L\'aggiornamento è stato scaricato e verrà installato al riavvio',
                buttons: ['Riavvia ora', 'Più tardi'],
                cancelId: 1
            }).then(({ response }) => {
                if (response === 0) {
                    autoUpdater.quitAndInstall();
                }
            });
        });

        autoUpdater.on('error', (err) => {
            dialog.showErrorBox('Errore di Aggiornamento', 
                `Si è verificato un errore durante l'aggiornamento: ${err.message}`);
        });

        // Gestione richieste IPC dal renderer
        ipcMain.handle('check-for-updates', () => {
            return autoUpdater.checkForUpdates();
        });
    }
}