export interface Preset {
  id: string;
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  parameters: Record<string, any>;
  metadata: {
    blenderVersion: string;
    renderEngine: string;
    lastUsed: string;
  };
  isLast?: boolean;
}
