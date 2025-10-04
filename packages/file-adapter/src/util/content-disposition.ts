/**
 * Content-Disposition header utilities with RFC 5987 UTF-8 support.
 * 
 * These utilities help create proper Content-Disposition headers
 * for file downloads, supporting international filenames.
 */

/**
 * Escapes a filename for use in Content-Disposition header.
 * 
 * @param filename - The filename to escape
 * @returns Escaped filename safe for header use
 */
function escapeFilename(filename: string): string {
  // Replace problematic characters
  return filename
    .replace(/[\\]/g, '\\\\') // Escape backslashes
    .replace(/"/g, '\\"'); // Escape quotes
}

/**
 * Encodes a filename using RFC 5987 UTF-8 encoding.
 * 
 * This allows non-ASCII characters in filenames to be properly
 * handled by browsers that support RFC 5987.
 * 
 * @param filename - The filename to encode
 * @returns RFC 5987 encoded filename
 */
function encodeRFC5987Filename(filename: string): string {
  // Encode using UTF-8 and percent-encode special characters
  return encodeURIComponent(filename)
    .replace(/['()]/g, escape) // Additional escaping for single quotes and parentheses
    .replace(/\*/g, '%2A'); // Escape asterisks
}

/**
 * Creates a Content-Disposition header value with proper filename handling.
 * 
 * Supports both ASCII and UTF-8 filenames with fallback for older browsers.
 * Uses RFC 5987 encoding for international filename support.
 * 
 * @param options - Content-Disposition configuration
 * @returns Content-Disposition header value
 * 
 * @example
 * ```typescript
 * // Simple download
 * createContentDisposition({ filename: 'report.pdf', type: 'attachment' });
 * // 'attachment; filename="report.pdf"'
 * 
 * // UTF-8 filename with fallback
 * createContentDisposition({ filename: '日本語ファイル.txt', type: 'attachment' });
 * // 'attachment; filename="?????????.txt"; filename*=UTF-8\'\'%E6%97%A5%E6%9C%AC%E8%AA%9E%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB.txt'
 * 
 * // Inline display
 * createContentDisposition({ filename: 'image.jpg', type: 'inline' });
 * // 'inline; filename="image.jpg"'
 * ```
 */
export function createContentDisposition(options: {
  filename: string;
  type: 'inline' | 'attachment';
}): string {
  const { filename, type } = options;
  
  if (!filename) {
    return type;
  }
  
  // Check if filename contains non-ASCII characters
  const hasNonAscii = /[^\x20-\x7E]/.test(filename);
  
  if (!hasNonAscii) {
    // Simple ASCII filename
    return `${type}; filename="${escapeFilename(filename)}"`;
  }
  
  // UTF-8 filename with RFC 5987 support and ASCII fallback
  const escapedFilename = escapeFilename(filename);
  const encodedFilename = encodeRFC5987Filename(filename);
  
  // Create ASCII fallback by replacing non-ASCII characters with '?'
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '?');
  
  return `${type}; filename="${escapeFilename(asciiFallback)}"; filename*=UTF-8''${encodedFilename}`;
}

/**
 * Extracts filename from a file path for use in Content-Disposition.
 * 
 * @param path - The file path
 * @returns The filename part of the path
 * 
 * @example
 * ```typescript
 * extractFilename('/var/www/uploads/document.pdf'); // 'document.pdf'
 * extractFilename('C:\\Users\\file.txt'); // 'file.txt'
 * extractFilename('simple-file.jpg'); // 'simple-file.jpg'
 * ```
 */
export function extractFilename(path: string): string {
  // Handle both forward and backward slashes
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  
  if (lastSlash === -1) {
    return path; // No path separators, return as-is
  }
  
  return path.slice(lastSlash + 1);
}