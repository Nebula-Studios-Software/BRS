interface Window {
  electron: {
    openFile: (options: Electron.OpenDialogOptions) => Promise<string | undefined>
    openDirectory: (options: Electron.OpenDialogOptions) => Promise<string | undefined>
    openPath: (dirPath: string) => Promise<boolean>
    readFile: (filePath: string) => Promise<string>
    writeFile: (filePath: string, data: string) => Promise<void>
    exists: (path: string) => Promise<boolean>
    mkdir: (path: string) => Promise<void>
    platform: string
    execute: (command: string, args: string[]) => Promise<{
      code: number
      stdout: string
      stderr: string
      pid?: number  // PID is now returned at the top level
    }>
    getAppDataPath: () => string
    killProcess: (pid: number) => Promise<boolean>
    writeLogs: (logPath: string, content: string) => Promise<boolean>
    getSystemMemory: () => SystemMemory;
    getSystemUsage: () => Promise<SystemUsage>;
  }
  ipcRenderer: {
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => void
    removeAllListeners: (channel: string) => void
    send: (channel: string, ...args: any[]) => void
  }
}

interface SystemMemory {
  total: string;
  used: string;
  free: string;
}

interface GPUDetails {
  memoryUtilization: number;
  memoryUsed: number;
  memoryTotal: number;
  temperature: number;
}

interface SystemUsage {
  cpu: number;
  cpuModel: string;
  cpuCount: number;
  cpuPerCore: number[];
  gpu: number | null;
  gpuModel: string | null;
  gpuDetails: GPUDetails | null;
}

interface Electron {
  getSystemMemory: () => SystemMemory;
  getSystemUsage: () => Promise<SystemUsage>;
}