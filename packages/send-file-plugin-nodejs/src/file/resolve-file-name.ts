import { basename } from 'node:path';

/**
 * Extract filename from file path if not provided
 */
export function resolveFilename(filePath: string, userFilename?: string): string {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return userFilename || basename(filePath);
}
