import { EventEmitter } from 'events';
import path from 'path';

// Definizione dei livelli di log
export enum LogLevel {
	DEBUG = 'DEBUG',
	INFO = 'INFO',
	WARNING = 'WARNING',
	ERROR = 'ERROR',
}

export interface LogEntry {
	timestamp: Date;
	level: LogLevel;
	message: string;
	error?: Error;
}

export interface RenderProgress {
	frame: number;
	startFrame: number; // Aggiungiamo il frame iniziale
	totalFrames: number;
	memory: string;
	peakMemory: string;
	currentSample?: number;
	totalSamples?: number;
	inCompositing: boolean;
	compositingOperation?: string;
	frameProgress?: number;
}

interface ProcessResult {
	code: number;
	stdout: string;
	stderr: string;
}

interface RenderLog {
	id: string;
	engine: string;
	startDate: string;
	endDate: string;
	command: string;
	parameters: Record<string, any>;
	renderTime: number;
	status: 'completed' | 'stopped' | 'error';
}

// Utility function to check if we're in a browser environment
const isBrowser = () => typeof window !== 'undefined';

export class BlenderExecutor extends EventEmitter {
	private engine: string;
	private startTime: Date | null;
	private command: string;
	private parameters: Record<string, any>;
	private elapsedTime: number;
	private state: {
		isRendering: boolean;
		pid: number | null;
		startTime: Date | null;
		elapsedTime: number;
	};
	private startFrame = 1;
	private endFrame = 1;
	private logPath: string;
	private logLevel: LogLevel = LogLevel.INFO;
	private logBuffer: LogEntry[] = [];
	private readonly MAX_LOG_BUFFER_SIZE = 1000;
	private readonly LOG_FLUSH_INTERVAL = 5000; // 5 secondi

	constructor() {
		super();
		this.engine = 'Unknown';
		this.startTime = null;
		this.command = '';
		this.parameters = {};
		this.elapsedTime = 0;
		this.state = {
			isRendering: false,
			pid: null,
			startTime: null,
			elapsedTime: 0,
		};
		this.logPath =
			isBrowser() && window.electron
				? path.join(window.electron.getAppDataPath(), 'render.log')
				: 'render.log';
		this.ensureLogDirectory();
		this.startLogFlushInterval();
	}

	private startLogFlushInterval() {
		setInterval(() => this.flushLogs(), this.LOG_FLUSH_INTERVAL);
	}

	private async flushLogs() {
		if (this.logBuffer.length === 0) return;

		const logsToWrite = [...this.logBuffer];
		this.logBuffer = [];

		try {
			const logContent = logsToWrite
				.map(
					(entry) =>
						`[${entry.timestamp.toISOString()}] [${entry.level}] ${entry.message}`
				)
				.join('\n');

			await this.writeToLog(logContent);
		} catch (error) {
			console.error('Errore durante il flush dei log:', error);
			// Ripristina i log non scritti nel buffer
			this.logBuffer = [...logsToWrite, ...this.logBuffer];
		}
	}

	private async log(level: LogLevel, message: string, error?: Error) {
		const entry: LogEntry = {
			timestamp: new Date(),
			level,
			message,
			error,
		};

		this.logBuffer.push(entry);

		if (this.logBuffer.length >= this.MAX_LOG_BUFFER_SIZE) {
			await this.flushLogs();
		}

		// Emetti l'evento di log per l'interfaccia utente
		this.emit('log', entry);
	}

	private ensureLogDirectory() {
		if (!isBrowser()) {
			return;
		}

		if (typeof window === 'undefined') {
			const fs = require('fs');
			const dir = path.dirname(this.logPath);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
		}
	}

	private async writeToLog(message: string) {
		if (!isBrowser() || !window.electron) {
			console.log(message);
			return;
		}

		try {
			await window.electron.writeLogs(this.logPath, message);
		} catch (error) {
			console.error('Errore durante la scrittura dei log:', error);
			await this.log(
				LogLevel.ERROR,
				'Errore durante la scrittura dei log',
				error as Error
			);
		}
	}

	private setupIpcListeners() {
		if (isBrowser() && window.ipcRenderer) {
			// Remove any existing listeners
			window.ipcRenderer.removeAllListeners('process:output');
			window.ipcRenderer.removeAllListeners('process:started');

			// Setup process output listener
			window.ipcRenderer.on('process:output', (_event: any, line: string) => {
				if (line.trim()) {
					this.processOutputLine(line.trim());
				}
			});

			// Setup process started listener to get PID early
			window.ipcRenderer.on('process:started', (_event: any, pid: number) => {
				console.log(`Received process:started event with PID: ${pid}`);
				if (pid) {
					this.state.pid = pid;
					console.log(`Process PID updated early via IPC: ${pid}`, this.state);
				}
			});
		}
	}

	setEngine(engine: string) {
		this.engine = engine;
	}

	private updateElapsedTime() {
		if (this.state.startTime) {
			this.elapsedTime = Math.floor((new Date().getTime() - this.state.startTime.getTime()) / 1000);
		}
	}

	async execute(
		command: string[],
		startFrame = 1,
		endFrame = 1
	): Promise<boolean> {
		if (this.state.isRendering) {
			const message = 'ERROR: Un altro processo di rendering è già in esecuzione';
			await this.log(LogLevel.ERROR, message);
			this.emit('output', message);
			return false;
		}

		this.startFrame = startFrame;
		this.endFrame = endFrame;

		let timeInterval: NodeJS.Timeout | undefined;

		try {
			// Determina l'engine dal comando
			if (command.includes('cycles')) {
				this.setEngine('Cycles');
			} else if (command.includes('eevee')) {
				this.setEngine('Eevee');
			} else if (command.includes('workbench')) {
				this.setEngine('Workbench');
			} else {
				this.setEngine('Unknown');
			}

			// Estrai i parametri dal comando
			const params: Record<string, any> = {};
			command.forEach(arg => {
				if (arg.startsWith('--')) {
					const [key, value] = arg.slice(2).split('=');
					params[key] = value;
				}
			});

			// Salva il comando e i parametri
			this.command = command.join(' ');
			this.parameters = {
				startFrame,
				endFrame,
				renderEngine: this.engine,
				outputFormat: 'PNG',
				resolution: '1920x1080',
			};

			this.state = {
				isRendering: true,
				pid: null,
				startTime: new Date(),
				elapsedTime: 0,
			};

			// Avvio l'intervallo per aggiornare il tempo
			timeInterval = setInterval(() => {
				this.updateElapsedTime();
			}, 1000);

			this.emit('renderStarted');
			const commandStr = command.join(' ');
			await this.log(LogLevel.INFO, `Avvio comando: ${commandStr}`);
			this.emit('output', `Avvio comando: ${commandStr}`);

			if (!isBrowser() || !window.electron) {
				this.state.isRendering = false;
				const message = 'Non in ambiente browser';
				await this.log(LogLevel.ERROR, message);
				this.emit('renderCompleted', false, message);
				return false;
			}

			this.setupIpcListeners();

			const cmdExec = command[0];
			const cmdArgs = command.slice(1);

			await this.log(
				LogLevel.DEBUG,
				`Avvio processo: ${cmdExec} ${cmdArgs.join(' ')}`
			);
			const result = await window.electron.execute(cmdExec, cmdArgs);

			if (result.pid) {
				this.state.pid = result.pid;
				await this.log(LogLevel.DEBUG, `Processo avviato con PID: ${result.pid}`);
			} else {
				await this.log(LogLevel.WARNING, 'Processo avviato ma nessun PID ricevuto');
			}

			if (result.code === 0) {
				const message = 'Rendering completato con successo';
				await this.log(LogLevel.INFO, message);
				this.emit('output', message);
				this.emit('renderCompleted', true, message);
				this.saveRenderLog('completed');
			} else if (result.code === -1) {
				const message = "Processo di rendering interrotto dall'utente";
				await this.log(LogLevel.INFO, message);
				this.emit('output', message);
				this.emit('renderCompleted', false, message);
				this.saveRenderLog('stopped');
			} else {
				const message = `Blender terminato con codice di errore ${result.code}`;
				await this.log(LogLevel.ERROR, message);
				this.emit('output', message);
				this.emit('renderCompleted', false, message);
				this.saveRenderLog('error');
			}

			return result.code === 0;
		} catch (error) {
			const message = `Errore durante l'esecuzione del processo: ${error}`;
			await this.log(LogLevel.ERROR, message, error as Error);
			this.emit('output', message);
			this.emit('renderCompleted', false, `Errore: ${error}`);
			this.saveRenderLog('error');
			return false;
		} finally {
			if (window.ipcRenderer) {
				window.ipcRenderer.removeAllListeners('process:output');
			}
			this.state.isRendering = false;
			await this.flushLogs();
			if (timeInterval) {
				clearInterval(timeInterval);
			}
		}
	}

	private async processOutputLine(line: string) {
		await this.writeToLog(line);
		this.emit('output', line);
		this.parseProgress(line);
	}

	private parseProgress(line: string) {
		// Parse frame progress
		const frameMatch = line.match(/Fra:(\d+)/);
		if (frameMatch) {
			const currentFrame = parseInt(frameMatch[1]);
			const totalFrames = this.endFrame - this.startFrame + 1;

			// Calcola il progresso relativo al range di frame specificato
			const relativeProgress = Math.max(
				0,
				Math.min(100, ((currentFrame - this.startFrame) / (totalFrames - 1)) * 100)
			);

			const progress: RenderProgress = {
				frame: currentFrame,
				startFrame: this.startFrame, // Aggiungiamo il frame iniziale
				totalFrames: this.endFrame, // Usa il frame finale come totale
				frameProgress: relativeProgress,
				memory: '0MB',
				peakMemory: '0MB',
				inCompositing: false,
			};

			// Parse memory usage
			const memMatch = line.match(/Mem:([\d.]+)([MG]).*Peak\s+([\d.]+)([MG])/);
			if (memMatch) {
				const current = parseFloat(memMatch[1]);
				const peak = parseFloat(memMatch[3]);
				const currentUnit = memMatch[2];
				const peakUnit = memMatch[4];

				progress.memory = `${current}${currentUnit}B`;
				progress.peakMemory = `${peak}${peakUnit}B`;
			}

			// Parse sample progress for Cycles
			const sampleMatch = line.match(/Sample (\d+)\/(\d+)/);
			if (sampleMatch) {
				progress.currentSample = parseInt(sampleMatch[1]);
				progress.totalSamples = parseInt(sampleMatch[2]);
			}

			// Check for compositing
			if (line.includes('Compositing')) {
				progress.inCompositing = true;
				const compMatch = line.match(/Compositing \| (.*?)(?=\||$)/);
				if (compMatch) {
					progress.compositingOperation = compMatch[1].trim();
				}
			}

			this.emit('renderProgress', progress);
		}
	}

	private saveRenderLog(status: 'completed' | 'stopped' | 'error') {
		if (typeof window === 'undefined' || !window.electron) return;

		const log: RenderLog = {
			id: crypto.randomUUID(),
			engine: this.engine || 'Unknown',
			startDate: this.state.startTime?.toISOString() || new Date().toISOString(),
			endDate: new Date().toISOString(),
			command: this.command,
			parameters: this.parameters,
			renderTime: this.elapsedTime || 0,
			status: status
		};

		// Carica i log esistenti
		const savedLogs = localStorage.getItem('renderHistory');
		const logs = savedLogs ? JSON.parse(savedLogs) : [];

		// Aggiungi il nuovo log
		logs.push(log);

		// Salva i log aggiornati
		localStorage.setItem('renderHistory', JSON.stringify(logs));
	}

	async stop(): Promise<void> {
		console.log('Stop chiamato, stato corrente:', this.state);

		if (!this.state.pid) {
			console.log('Fermata ignorata: PID mancante');
			return;
		}

		try {
			console.log(`Tentativo di terminare il processo con PID: ${this.state.pid}`);
			const killed = await window.electron.killProcess(this.state.pid);
			console.log(`Risultato killProcess: ${killed}`);

			if (killed) {
				this.saveRenderLog('stopped');
				this.state = {
					...this.state,
					isRendering: false,
					pid: null,
					startTime: null,
					elapsedTime: 0,
				};
				this.emit('renderComplete');
				console.log('Processo terminato con successo');
			} else {
				console.log("Fallimento nell'arresto del processo");
			}
		} catch (error) {
			console.error('Errore durante la fermata:', error);
		}
	}

	isRendering(): boolean {
		return this.state.isRendering;
	}
}
