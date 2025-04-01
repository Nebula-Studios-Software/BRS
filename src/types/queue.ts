import { Preset } from './preset';

export type QueueItemStatus = 'pending' | 'scheduled' | 'running' | 'completed' | 'failed';

export interface QueueItem {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: number;
  dependencies?: string[];
  scheduledTime?: string;
  createdAt: string;
  updatedAt: string;
  command?: string;
  parameters?: Record<string, any>;
  outputPath?: string;
  estimatedDuration?: number;
  progress?: number;
  currentFrame?: number;
  totalFrames?: number;
  currentSample?: number;
  totalSamples?: number;
  inCompositing?: boolean;
  compositingOperation?: string;
}

export interface QueueSettings {
  autoStart: boolean;
  maxConcurrent: number;
  defaultPriority: number;
  defaultOutputPath: string;
}

export interface QueueState {
  items: QueueItem[];
  isProcessing: boolean;
  processingInterval: NodeJS.Timeout | null;
  settings: QueueSettings;
}
