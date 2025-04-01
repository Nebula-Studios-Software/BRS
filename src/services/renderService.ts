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
      toast.error('Un rendering è già in corso');
      return;
    }

    try {
      this.isRendering = true;
      const { id } = await window.electronAPI.executeCommand(command);
      this.currentProcessId = id;

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
        if (code === 0) {
          toast.success('Rendering completato con successo');
          if (options.onComplete) {
            options.onComplete();
          }
        } else {
          const error = `Rendering completato con codice di errore: ${code}`;
          toast.error(error);
          if (options.onError) {
            options.onError(error);
          }
        }
      });

      // Ascolta gli eventi di errore
      window.electronAPI.on<string>(`error-${id}`, (error) => {
        this.isRendering = false;
        this.currentProcessId = null;
        toast.error(`Errore durante il rendering: ${error}`);
        if (options.onError) {
          options.onError(error);
        }
      });
    } catch (error) {
      this.isRendering = false;
      this.currentProcessId = null;
      toast.error('Errore durante l\'avvio del rendering');
      if (options.onError) {
        options.onError(error instanceof Error ? error.message : 'Errore sconosciuto');
      }
    }
  }

  public async stopRender(): Promise<void> {
    if (!this.currentProcessId) {
      toast.error('Nessun rendering in corso');
      return;
    }

    try {
      await window.electronAPI.stopProcess(this.currentProcessId);
      this.isRendering = false;
      this.currentProcessId = null;
      toast.success('Rendering interrotto');
    } catch (error) {
      toast.error('Errore durante l\'interruzione del rendering');
    }
  }

  public isCurrentlyRendering(): boolean {
    return this.isRendering;
  }
}

export const renderService = RenderService.getInstance();
