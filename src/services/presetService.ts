import { Preset } from '@/types/preset';

class PresetService {
  private static instance: PresetService;

  private constructor() {}

  public static getInstance(): PresetService {
    if (!PresetService.instance) {
      PresetService.instance = new PresetService();
    }
    return PresetService.instance;
  }

  public async getAllPresets(): Promise<Preset[]> {
    return window.electronAPI.getAllPresets();
  }

  public async getPreset(id: string): Promise<Preset | null> {
    return window.electronAPI.getPreset(id);
  }

  public async savePreset(preset: Preset): Promise<boolean> {
    return window.electronAPI.savePreset(preset);
  }

  public async deletePreset(id: string): Promise<boolean> {
    return window.electronAPI.deletePreset(id);
  }

  public async importPresets(filePath: string): Promise<{ success: boolean; message?: string }> {
    return window.electronAPI.importPresets(filePath);
  }

  public async exportPreset(id: string): Promise<{ success: boolean; data?: string }> {
    return window.electronAPI.exportPreset(id);
  }
}

export const presetService = PresetService.getInstance();
