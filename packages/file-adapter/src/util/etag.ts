import type { FileStats } from '../types.js';

/**
 * Creates a weak ETag from file statistics.
 * 
 * A weak ETag is based on file size and modification time, which is sufficient
 * for most caching scenarios and performs better than content-based ETags.
 * 
 * @param stats - File statistics containing size and modification time
 * @returns Weak ETag string in the format 'W/"size-mtime"'
 * 
 * @example
 * ```typescript
 * const stats = { size: 1024, mtime: new Date('2023-01-01'), isFile: true, isDirectory: false };
 * createWeakEtag(stats); // 'W/"1024-1672531200000"'
 * 
 * // Without modification time
 * const statsNoMtime = { size: 512, isFile: true, isDirectory: false };
 * createWeakEtag(statsNoMtime); // 'W/"512-0"'
 * ```
 */
export function createWeakEtag(stats: FileStats): string {
  const size = stats.size;
  const mtime = stats.mtime?.getTime() || 0;
  
  return `W/"${size}-${mtime}"`;
}

/**
 * Parses an ETag header value and extracts the tag value.
 * 
 * @param etag - The ETag header value
 * @returns The extracted tag value without quotes and W/ prefix
 * 
 * @example
 * ```typescript
 * parseEtag('W/"1024-1672531200000"'); // '1024-1672531200000'
 * parseEtag('"strong-etag"'); // 'strong-etag'
 * parseEtag('invalid'); // 'invalid'
 * ```
 */
export function parseEtag(etag: string): string {
  // Remove W/ prefix for weak ETags
  const cleaned = etag.startsWith('W/') ? etag.slice(2) : etag;
  
  // Remove surrounding quotes
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    return cleaned.slice(1, -1);
  }
  
  return cleaned;
}

/**
 * Compares two ETag values for equality.
 * 
 * Both weak and strong ETags are supported. According to RFC 7232,
 * weak ETags can be compared with both weak and strong ETags.
 * 
 * @param etag1 - First ETag value
 * @param etag2 - Second ETag value
 * @returns True if ETags are considered equal
 * 
 * @example
 * ```typescript
 * compareEtags('W/"123-456"', 'W/"123-456"'); // true
 * compareEtags('"123-456"', 'W/"123-456"'); // true
 * compareEtags('W/"123-456"', 'W/"789-012"'); // false
 * ```
 */
export function compareEtags(etag1: string, etag2: string): boolean {
  const tag1 = parseEtag(etag1);
  const tag2 = parseEtag(etag2);
  
  return tag1 === tag2;
}