/**
 * Browser-compatible path utilities
 */
function getDirectoryFromPath(fullPath: string): string {
  const lastSlash = Math.max(fullPath.lastIndexOf('/'), fullPath.lastIndexOf('\\'));
  return lastSlash >= 0 ? fullPath.substring(0, lastSlash) : '';
}

function getExtensionFromPath(fullPath: string): string {
  const filename = getFilenameFromPath(fullPath);
  const lastDot = filename.lastIndexOf('.');
  return lastDot >= 0 ? filename.substring(lastDot) : '';
}

function getNameWithoutExtension(fullPath: string): string {
  const filename = getFilenameFromPath(fullPath);
  const lastDot = filename.lastIndexOf('.');
  return lastDot >= 0 ? filename.substring(0, lastDot) : filename;
}

function joinPath(dir: string, filename: string): string {
  if (!dir) return filename;
  const separator = dir.includes('\\') ? '\\' : '/';
  return dir + separator + filename;
}

/**
 * Generates a unique filename by appending numeric suffixes if the file already exists
 * @param basePath - The base file path without extension (as Blender will add the extension)
 * @param outputFormat - The output format (e.g., 'PNG', 'JPEG') to determine the file extension
 * @returns A unique file path that doesn't conflict with existing files
 */
export async function generateUniqueFilename(basePath: string, outputFormat?: string): Promise<string> {
  // Check if electron API is available
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.fileExists) {
    // Map output formats to file extensions
    const formatExtensions: Record<string, string> = {
      'PNG': '.png',
      'JPEG': '.jpg',
      'JPEG2000': '.jp2',
      'TARGA': '.tga',
      'TIFF': '.tif',
      'BMP': '.bmp',
      'HDR': '.hdr',
      'OPEN_EXR': '.exr',
      'OPEN_EXR_MULTILAYER': '.exr',
      'FFMPEG': '.mp4', // Default for video
      'AVI_JPEG': '.avi',
      'AVI_RAW': '.avi'
    };

    // Get the appropriate extension based on output format
    const ext = outputFormat ? (formatExtensions[outputFormat.toUpperCase()] || '.png') : '.png';
    const fullPath = `${basePath}${ext}`;
    
    const exists = await window.electronAPI.fileExists(fullPath);
    
    if (!exists) {
      return basePath; // Return base path without extension for Blender command
    }

    // Parse the path to get directory and name
    const dir = getDirectoryFromPath(basePath);
    const nameWithoutPath = getFilenameFromPath(basePath);

    let counter = 1;
    let uniquePath: string;

    do {
      const uniqueName = `${nameWithoutPath}_${counter}`;
      const uniqueBasePath = joinPath(dir, uniqueName);
      const uniqueFullPath = `${uniqueBasePath}${ext}`;
      
      if (!(await window.electronAPI.fileExists(uniqueFullPath))) {
        return uniqueBasePath; // Return base path without extension for Blender command
      }
      
      counter++;
    } while (counter < 1000); // Safety limit

    // If we can't find a unique name after 1000 attempts, return original with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const timestampName = `${nameWithoutPath}_${timestamp}`;
    return joinPath(dir, timestampName);
  }

  // Fallback: return original path if electron API is not available
  return basePath;
}

/**
 * Extracts the filename portion from a full path for display purposes
 * @param fullPath - The complete file path
 * @returns Just the filename with extension
 */
export function getFilenameFromPath(fullPath: string): string {
  const lastSlash = Math.max(fullPath.lastIndexOf('/'), fullPath.lastIndexOf('\\'));
  return lastSlash >= 0 ? fullPath.substring(lastSlash + 1) : fullPath;
}