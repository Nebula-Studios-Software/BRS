export interface BlenderVersion {
  version: string
  path: string
  executablePath: string
}

export async function detectBlenderVersions(): Promise<BlenderVersion[]> {
  if (typeof window === 'undefined') return []
  return window.electron.blender.detectVersions()
}