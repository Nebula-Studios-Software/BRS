import { renderParameters } from '@/config/renderParameters';
import { z } from 'zod';
import { Preset } from '@/types/preset';

// Schema per la validazione dei preset
const PresetSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  createdAt: z.string(),
  updatedAt: z.string(),
  parameters: z.record(z.any()),
  metadata: z.object({
    blenderVersion: z.string().default(''),
    renderEngine: z.string().default(''),
    lastUsed: z.string(),
  }),
  isLast: z.boolean().optional(),
});

class PresetManager {
  private static instance: PresetManager;
  private currentSettings: Record<string, any> = {};

  private constructor() {
    this.currentSettings = this.getDefaultParameters();
  }

  public static getInstance(): PresetManager {
    if (!PresetManager.instance) {
      PresetManager.instance = new PresetManager();
    }
    return PresetManager.instance;
  }

  public setCurrentSettings(settings: Record<string, any>): void {
    this.currentSettings = settings;
  }

  public getCurrentSettings(): Record<string, any> {
    return this.currentSettings;
  }

  public async createPreset(name: string, options: { description?: string; isLast?: boolean } = {}): Promise<Preset> {
    const now = new Date().toISOString();
    const preset: Preset = {
      id: crypto.randomUUID(),
      name,
      description: options.description,
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      parameters: { ...this.currentSettings },
      metadata: {
        blenderVersion: this.currentSettings.blenderVersion || '',
        renderEngine: this.currentSettings.renderEngine || '',
        lastUsed: now,
      },
      isLast: options.isLast || false,
    };

    // Validazione del preset
    const validatedPreset = PresetSchema.parse(preset);
    await window.electronAPI.savePreset(validatedPreset);

    return validatedPreset;
  }

  public async updatePreset(id: string, updates: Partial<Preset>): Promise<Preset | null> {
    const preset = await window.electronAPI.getPreset(id);
    if (!preset) return null;

    const updatedPreset: Preset = {
      ...preset,
      ...updates,
      updatedAt: new Date().toISOString(),
      metadata: {
        blenderVersion: preset.metadata.blenderVersion || '',
        renderEngine: preset.metadata.renderEngine || '',
        lastUsed: preset.metadata.lastUsed,
        ...updates.metadata,
      },
    };

    // Validazione del preset aggiornato
    const validatedPreset = PresetSchema.parse(updatedPreset);
    await window.electronAPI.savePreset(validatedPreset);

    return validatedPreset;
  }

  public async deletePreset(id: string): Promise<boolean> {
    return await window.electronAPI.deletePreset(id);
  }

  public async getPreset(id: string): Promise<Preset | null> {
    const preset = await window.electronAPI.getPreset(id);
    if (!preset) return null;
    return PresetSchema.parse(preset);
  }

  public async getAllPresets(): Promise<Preset[]> {
    const presets = await window.electronAPI.getAllPresets();
    return presets.map(preset => PresetSchema.parse(preset));
  }

  public async applyPreset(id: string): Promise<boolean> {
    const preset = await window.electronAPI.getPreset(id);
    if (!preset) return false;

    this.currentSettings = { ...preset.parameters };
    return true;
  }

  public validatePreset(preset: unknown): { success: boolean; errors?: string[] } {
    try {
      PresetSchema.parse(preset);
      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map(err => err.message),
        };
      }
      return {
        success: false,
        errors: ['Invalid preset format'],
      };
    }
  }

  private getDefaultParameters(): Record<string, any> {
    const defaultParams: Record<string, any> = {};
    renderParameters.parameters.forEach(param => {
      defaultParams[param.id] = param.defaultValue;
    });
    return defaultParams;
  }

  public async exportPreset(id: string): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const preset = await window.electronAPI.getPreset(id);
      if (!preset) {
        return { success: false, error: 'Preset not found' };
      }

      const data = JSON.stringify(preset, null, 2);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to export preset' };
    }
  }
}

export const presetManager = PresetManager.getInstance();
