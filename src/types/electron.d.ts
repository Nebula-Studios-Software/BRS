import { Preset } from './preset';
import { HistoryItem } from './history';

interface BlenderVersion {
  path: string;
  version: string;
}

interface FileDialogOptions {
  filters?: { name: string; extensions: string[] }[];
  properties?: ('openFile' | 'openDirectory' | 'multiSelections')[];
}

interface SystemStats {
	cpu: {
		usage: string;
		cores: string[];
	};
	memory: {
		used: string;
		total: string;
		percentage: string;
	};
	gpu: Array<{
		name: string;
		usage: string;
		memory: {
			used: string;
			total: string;
			percentage: string;
		};
		temperature: string;
		power: string;
		coreClock?: string;
		memoryClock?: string;
	}>;
}

export interface ProgressEventData {
	progress?: number;
	currentFrame?: number;
	totalFrames?: number;
	memoryUsage?: number;
	peakMemory?: number;
	currentSample?: number;
	totalSamples?: number;
	inCompositing?: boolean;
	compositingOperation?: string;
}

export interface ElectronAPI {
  platform: string;
  openFileDialog: (options: {
    filters?: { name: string; extensions: string[] }[];
    properties?: string[];
  }) => Promise<string[]>;
  openDirectory: (options?: FileDialogOptions) => Promise<string | null>;
  openPath: (dirPath: string) => Promise<boolean>;
  readFile: (filePath: string) => Promise<string | null>;
  writeFile: (filePath: string, data: string) => Promise<void>;
  getAppDataPath: () => Promise<string>;
  getAllPresets: () => Promise<Preset[]>;
  getPreset: (id: string) => Promise<Preset | null>;
  savePreset: (preset: Preset) => Promise<boolean>;
  deletePreset: (id: string) => Promise<boolean>;
  renamePreset: (id: string, newName: string) => Promise<boolean>;
  importPresets: (filePath: string) => Promise<{ success: boolean; message?: string }>;
  exportPreset: (id: string) => Promise<{ success: boolean; data?: string }>;
  detectBlender: () => Promise<string | null>;
  executeCommand: (command: string) => Promise<{ id: string }>;
  stopProcess: (id: string) => Promise<void>;
  on: <T = unknown>(channel: string, callback: (data: T) => void) => void;
  removeAllListeners: (channel: string) => void;
  startSystemMonitor: () => Promise<void>;
  stopSystemMonitor: () => Promise<void>;
  onSystemStats: (callback: (stats: SystemStats) => void) => void;
  getBlenderVersion: () => Promise<string>;
  getRenderEngine: () => Promise<string>;
  getOutputPath: () => Promise<string>;
  saveHistory: (history: HistoryItem[]) => Promise<boolean>;
  loadHistory: () => Promise<HistoryItem[]>;
  showDirectoryPicker: () => Promise<string | null>;
  // Onboarding APIs
  getOnboardingStatus: () => Promise<{ completed: boolean }>;
  setOnboardingCompleted: (status: boolean) => Promise<boolean>;
  // File system APIs
  fileExists: (filePath: string) => Promise<boolean>;
  // Close confirmation API
  confirmCloseApp: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export interface Preset {
  id: string;
  name: string;
  command: string;
  createdAt: Date;
  updatedAt: Date;
}
