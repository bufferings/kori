import { lookup } from 'mime-types';

/**
 * Detect MIME type from file path
 */
export function detectMimeType(filePath: string): string {
  const mimeType = lookup(filePath);
  return mimeType || 'application/octet-stream';
}
