const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

class RenderManager {
  constructor() {
    this.processes = new Map();
    this.setupIpcHandlers();
  }

  setupIpcHandlers() {
    ipcMain.handle('executeCommand', async (event, command) => {
      const processId = await this.startRender(command, event.sender);
      return { id: processId };
    });

    ipcMain.handle('stopProcess', async (_, processId) => {
      return this.stopProcess(processId);
    });
  }

  isCriticalError(error) {
    const criticalErrors = [
      'No camera found in scene',
      'Process exited unexpectedly',
      'Failed to start Blender',
      'Invalid command',
      'Segmentation fault',
      'Access violation',
      'Fatal error',
      'Exception',
      'terminated unexpectedly',
      'possible crash'
    ];
    return criticalErrors.some(criticalError => error.toLowerCase().includes(criticalError.toLowerCase()));
  }

  getFrameRange(command) {
    const frameStartMatch = command.match(/-s\s+(\d+)/);
    const frameEndMatch = command.match(/-e\s+(\d+)/);

    if (!frameStartMatch || !frameEndMatch) {
      return { start: 1, end: 1 };
    }

    return {
      start: parseInt(frameStartMatch[1]),
      end: parseInt(frameEndMatch[1])
    };
  }

  async startRender(command, sender) {
    try {
      const process = spawn(command, [], {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const processId = process.pid.toString();
      let currentFrame = 0;
      const { start, end } = this.getFrameRange(command);
      let memoryUsage = 0;
      let peakMemory = 0;
      let currentSample = 0;
      let totalSamples = 0;
      let inCompositing = false;
      let compositingOperation = '';

      // Invia il range di frame all'inizio
      sender.send(`progress-${processId}`, {
        currentFrame: start,
        totalFrames: end,
        progress: 0
      });

      process.stdout.on('data', (data) => {
        const output = data.toString();

        // Log dell'output
        sender.send(`progress-${processId}`, output);

        // Parsing dell'output per estrarre informazioni
        if (output.includes('Fra:')) {
          // Estrai il numero di frame
          const frameMatch = output.match(/Fra:(\d+)/);
          if (frameMatch) {
            currentFrame = parseInt(frameMatch[1]);
            const progress = ((currentFrame - start) / (end - start)) * 100;
            sender.send(`progress-${processId}`, {
              currentFrame,
              totalFrames: end,
              progress
            });
          }

          // Estrai l'uso della memoria
          const memMatch = output.match(/Mem:([\d.]+)([MG]).*Peak\s+([\d.]+)([MG])/);
          if (memMatch) {
            const current = parseFloat(memMatch[1]);
            const peak = parseFloat(memMatch[3]);
            const currentUnit = memMatch[2];
            const peakUnit = memMatch[4];

            // Converti in MB
            memoryUsage = currentUnit === 'G' ? current * 1024 : current;
            peakMemory = peakUnit === 'G' ? peak * 1024 : peak;

            sender.send(`progress-${processId}`, {
              memoryUsage,
              peakMemory
            });
          }

          // Parse sample progress for Cycles
          const sampleMatch = output.match(/Sample (\d+)\/(\d+)/);
          if (sampleMatch) {
            currentSample = parseInt(sampleMatch[1]);
            totalSamples = parseInt(sampleMatch[2]);
            sender.send(`progress-${processId}`, {
              currentSample,
              totalSamples
            });
          }

          // Check for compositing
          if (output.includes('Compositing')) {
            inCompositing = true;
            const compMatch = output.match(/Compositing \| (.*?)(?=\||$)/);
            if (compMatch) {
              compositingOperation = compMatch[1].trim();
            }
            sender.send(`progress-${processId}`, {
              inCompositing,
              compositingOperation
            });
          }
        }

        // Check for errors
        if (output.toLowerCase().includes('error') || output.toLowerCase().includes('exception')) {
          sender.send(`error-${processId}`, output);
        }

        // Check for process termination
        if (output.includes('Blender quit') || output.includes('Quit')) {
          sender.send(`complete-${processId}`, 0);
        }
      });

      process.stderr.on('data', (data) => {
        const error = data.toString();
        if (this.isCriticalError(error)) {
          sender.send(`error-${processId}`, error);
        } else {
          sender.send(`progress-${processId}`, `ERROR: ${error}`);
        }
      });

      process.on('close', (code) => {
        sender.send(`complete-${processId}`, code);
      });

      process.on('error', (error) => {
        const errorMessage = error.message;
        if (this.isCriticalError(errorMessage)) {
          sender.send(`error-${processId}`, errorMessage);
        } else {
          sender.send(`progress-${processId}`, `ERROR: ${errorMessage}`);
        }
      });

      // Salva il processo nella Map usando il PID di sistema
      this.processes.set(processId, { process });

      return processId;
    } catch (error) {
      sender.send(`error-${processId}`, error.message);
      throw error;
    }
  }

  async stopProcess(processId) {
    const renderProcess = this.processes.get(processId);
    if (renderProcess) {
      if (renderProcess.process) {
        // Usa il PID di sistema per terminare il processo
        renderProcess.process.kill();
      }
      this.processes.delete(processId);
    }
  }

  async getBlenderVersion(blenderPath) {
    try {
      return new Promise((resolve, reject) => {
        const process = spawn(blenderPath, ['--version'], {
          shell: true,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';

        process.stdout.on('data', (data) => {
          output += data.toString();
        });

        process.on('close', (code) => {
          if (code === 0) {
            const versionMatch = output.match(/Blender\s+([\d.]+)/);
            resolve(versionMatch ? versionMatch[1] : 'Unknown');
          } else {
            reject(new Error('Failed to get Blender version'));
          }
        });

        process.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error getting Blender version:', error);
      return 'Unknown';
    }
  }
}

module.exports = RenderManager;
