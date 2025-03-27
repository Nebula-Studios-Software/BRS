import { Parameter } from './paramDefinitions';
import path from 'path';

export interface Preset {
	name: string;
	blenderPath: string;
	parameters: { [key: string]: any };
}

export interface UIState {
	logFilters: {
		showInfo: boolean;
		showWarning: boolean;
		showError: boolean;
		detailLevel: number; // 0=Detailed, 1=Standard, 2=Minimal
	};
	activePreset: string; // Aggiunto per memorizzare il preset attivo
}

export interface Settings {
	blenderPath: string;
	parameters: { [key: string]: any };
	uiState: UIState;
	lastBlenderVersion?: string;
}

// Utility function to check if we're in a browser environment
const isBrowser = () => typeof window !== 'undefined';

// Utility function to get app data path safely
const getAppDataPath = () => {
	if (!isBrowser()) {
		return '';
	}
	return window.electron.getAppDataPath();
};

export class SettingsManager {
	private settingsPath: string;
	private presetsPath: string;
	private settings: Settings;
	private presets: { [key: string]: Preset };
	private initialized: boolean = false;

	constructor() {
		const appDataPath = isBrowser() ? getAppDataPath() : '';

		this.settingsPath = appDataPath ? path.join(appDataPath, 'settings.json') : '';
		this.presetsPath = appDataPath ? path.join(appDataPath, 'presets.json') : '';

		// Initialize with default values
		this.settings = this.getDefaultSettings();
		this.presets = this.getDefaultPresets();
	}

	async init(): Promise<void> {
		if (this.initialized || !isBrowser()) return;

		try {
			// Create app directory if it doesn't exist
			const appDataPath = getAppDataPath();
			if (appDataPath) {
				await window.electron.mkdir(appDataPath);
			}

			// Load settings
			const savedSettings = await this.loadSettings();
			if (savedSettings) {
				this.settings = { ...this.getDefaultSettings(), ...savedSettings };
			} else {
				// Se non ci sono impostazioni salvate, usa e salva i valori predefiniti
				this.settings = this.getDefaultSettings();
				await this.saveSettings();
			}

			// Load presets
			const savedPresets = await this.loadPresets();
			if (savedPresets) {
				this.presets = { ...this.getDefaultPresets(), ...savedPresets };
			} else {
				// Se non ci sono preset salvati, usa e salva i valori predefiniti
				this.presets = this.getDefaultPresets();
				await this.savePresets();
			}

			this.initialized = true;
		} catch (error) {
			console.error('Error initializing SettingsManager:', error);
			// In caso di errore, usa comunque i valori predefiniti
			this.settings = this.getDefaultSettings();
			this.presets = this.getDefaultPresets();
			this.initialized = true;
		}
	}

	private getDefaultSettings(): Settings {
		return {
			blenderPath: '',
			parameters: {},
			uiState: {
				logFilters: {
					showInfo: true,
					showWarning: true,
					showError: true,
					detailLevel: 1,
				},
				activePreset: 'default', // Preset di default
			},
		};
	}

	private getDefaultPresets(): { [key: string]: Preset } {
		return {
			default: {
				name: 'Default',
				blenderPath: '',
				parameters: {},
			},
		};
	}

	private async initialize() {
		if (!isBrowser()) return;

		try {
			// Create app directory if it doesn't exist
			const appDataPath = getAppDataPath();
			if (appDataPath) {
				await window.electron.mkdir(appDataPath);
			}

			// Load settings
			const savedSettings = await this.loadSettings();
			if (savedSettings) {
				this.settings = { ...this.settings, ...savedSettings };
			}

			// Load presets
			const savedPresets = await this.loadPresets();
			if (savedPresets) {
				this.presets = { ...this.presets, ...savedPresets };
			}
		} catch (error) {
			console.error('Error initializing SettingsManager:', error);
		}
	}

	private async loadSettings(): Promise<Settings | null> {
		if (!isBrowser()) return null;

		try {
			const exists = await window.electron.exists(this.settingsPath);
			if (!exists) {
				return null;
			}
			
			const data = await window.electron.readFile(this.settingsPath);
			if (!data.trim()) {
				return null;
			}
			
			return JSON.parse(data);
		} catch (error) {
			console.error('Error loading settings:', error);
			return null;
		}
	}

	private async loadPresets(): Promise<{ [key: string]: Preset } | null> {
		if (!isBrowser()) return null;

		try {
			const exists = await window.electron.exists(this.presetsPath);
			if (exists) {
				const data = await window.electron.readFile(this.presetsPath);
				return JSON.parse(data);
			}
		} catch (error) {
			console.error('Error loading presets:', error);
		}
		return null;
	}

	async saveSettings(): Promise<void> {
		if (!isBrowser()) return;

		try {
			await window.electron.writeFile(
				this.settingsPath,
				JSON.stringify(this.settings, null, 2)
			);
		} catch (error) {
			console.error('Error saving settings:', error);
		}
	}

	async savePresets(): Promise<void> {
		if (!isBrowser()) return;

		try {
			await window.electron.writeFile(
				this.presetsPath,
				JSON.stringify(this.presets, null, 2)
			);
		} catch (error) {
			console.error('Error saving presets:', error);
		}
	}

	// Settings methods
	getSetting<K extends keyof Settings>(key: K): Settings[K] {
		return this.settings[key];
	}

	async setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
		this.settings[key] = value;
		await this.saveSettings();
	}

	getBlenderPath(): string {
		return this.settings.blenderPath;
	}

	async setBlenderPath(path: string): Promise<void> {
		this.settings.blenderPath = path;
		await this.saveSettings();
	}

	getParameters(): { [key: string]: any } {
		return this.settings.parameters;
	}

	async setParameters(parameters: { [key: string]: any }): Promise<void> {
		this.settings.parameters = parameters;
		await this.saveSettings();
	}

	getUIState(): UIState {
		return this.settings.uiState;
	}

	async setUIState(uiState: UIState): Promise<void> {
		this.settings.uiState = uiState;
		await this.saveSettings();
	}

	// Preset methods
	getPresetNames(): string[] {
		return Object.keys(this.presets);
	}

	getPreset(name: string): Preset | null {
		return this.presets[name] || null;
	}

	async saveAsPreset(name: string, settings: Preset): Promise<void> {
		this.presets[name] = settings;
		await this.savePresets();
	}

	async deletePreset(name: string): Promise<boolean> {
		if (name in this.presets && name !== 'default') {
			delete this.presets[name];
			await this.savePresets();
			return true;
		}
		return false;
	}

	async renamePreset(oldName: string, newName: string): Promise<boolean> {
		if (oldName in this.presets && oldName !== 'default') {
			this.presets[newName] = { ...this.presets[oldName] };
			delete this.presets[oldName];
			await this.savePresets();
			return true;
		}
		return false;
	}
}
