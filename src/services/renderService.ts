import { toast } from 'sonner';
import { ProgressEventData } from '@/types/electron';

interface RenderProgress {
  currentFrame: number;
  totalFrames: number;
}

interface RenderOptions {
  onProgress?: (progress: RenderProgress) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

class RenderService {
  private static instance: RenderService;
  private currentProcessId: string | null = null;
  private isRendering: boolean = false;

  private constructor() {}

  public static getInstance(): RenderService {
    if (!RenderService.instance) {
      RenderService.instance = new RenderService();
    }
    return RenderService.instance;
  }

  public async startRender(command: string, options: RenderOptions = {}): Promise<void> {
    if (this.isRendering) {
      return;
    }

    try {
      this.isRendering = true;
      const { id } = await window.electronAPI.executeCommand(command);
      this.currentProcessId = id;

      // Pulisce i listener precedenti per questo processo
      this.cleanupListeners(id);

      // Ascolta gli eventi di progresso
      window.electronAPI.on<ProgressEventData>(`progress-${id}`, (data) => {
        if (options.onProgress && data.currentFrame !== undefined && data.totalFrames !== undefined) {
          options.onProgress({
            currentFrame: data.currentFrame,
            totalFrames: data.totalFrames
          });
        }
      });

      // Ascolta l'evento di completamento
      window.electronAPI.on<number>(`complete-${id}`, (code) => {
        this.isRendering = false;
        this.currentProcessId = null;
        this.cleanupListeners(id);
        if (code === 0) {
          if (options.onComplete) {
            options.onComplete();
          }
        } else {
          const error = `Rendering completato con codice di errore: ${code}`;
          if (options.onError) {
            options.onError(error);
          }
        }
      });

      // Ascolta gli eventi di errore
      window.electronAPI.on<string>(`error-${id}`, (error) => {
        this.isRendering = false;
        this.currentProcessId = null;
        this.cleanupListeners(id);
        if (options.onError) {
          options.onError(error);
        }
      });
    } catch (error) {
      this.isRendering = false;
      this.currentProcessId = null;
      if (options.onError) {
        options.onError(error instanceof Error ? error.message : 'Errore sconosciuto');
      }
    }
  }

  public async stopRender(): Promise<void> {
    if (!this.currentProcessId) {
      return;
    }

    try {
      await window.electronAPI.stopProcess(this.currentProcessId);
      this.isRendering = false;
      this.currentProcessId = null;
    } catch (error) {
      // Error will be handled by the caller
      throw error;
    }
  }

  public isCurrentlyRendering(): boolean {
    return this.isRendering;
  }

  private cleanupListeners(processId: string): void {
    window.electronAPI.removeAllListeners(`progress-${processId}`);
    window.electronAPI.removeAllListeners(`complete-${processId}`);
    window.electronAPI.removeAllListeners(`error-${processId}`);
  }
}

export const renderService = RenderService.getInstance();
