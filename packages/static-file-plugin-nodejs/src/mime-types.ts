/**
 * MIME type mappings for common file extensions
 */
const MIME_TYPES: Record<string, string> = {
  // HTML
  '.html': 'text/html',
  '.htm': 'text/html',

  // CSS
  '.css': 'text/css',

  // JavaScript
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',

  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',

  // Fonts
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',

  // Documents
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.csv': 'text/csv',

  // Media
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',

  // Archives
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',

  // Other
  '.wasm': 'application/wasm',
} as const;

const DEFAULT_MIME_TYPE = 'application/octet-stream';

/**
 * Detect MIME type based on file extension
 */
export function detectMimeType(filePath: string): string {
  const lastDotIndex = filePath.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return DEFAULT_MIME_TYPE;
  }

  const extension = filePath.slice(lastDotIndex).toLowerCase();
  return MIME_TYPES[extension] ?? DEFAULT_MIME_TYPE;
}
