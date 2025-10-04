/**
 * Basic MIME type detection based on file extensions.
 * 
 * This provides a minimal set of common MIME types for web applications.
 * For more comprehensive MIME detection, use a dedicated library in specific adapters.
 */

/**
 * Common file extensions to MIME type mappings.
 */
const mimeTypeMap: Record<string, string> = {
  // Text files
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.ts': 'text/typescript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.md': 'text/markdown',
  
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  
  // Audio/Video
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  
  // Documents
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  
  // Fonts
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
};

/**
 * Detects the MIME type of a file based on its file extension.
 * 
 * @param path - The file path or filename
 * @returns The detected MIME type, defaults to 'application/octet-stream'
 * 
 * @example
 * ```typescript
 * detectMimeType('index.html'); // 'text/html'
 * detectMimeType('style.css');  // 'text/css'
 * detectMimeType('unknown.xyz'); // 'application/octet-stream'
 * ```
 */
export function detectMimeType(path: string): string {
  const lastDotIndex = path.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return 'application/octet-stream';
  }
  
  const extension = path.slice(lastDotIndex).toLowerCase();
  return mimeTypeMap[extension] || 'application/octet-stream';
}