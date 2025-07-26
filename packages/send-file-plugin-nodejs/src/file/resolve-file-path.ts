import { join, isAbsolute } from 'node:path';

/**
 * Resolve file path with optional root directory
 * Supports both absolute and relative paths cross-platform
 */
export function resolveFilePath(filePath: string, root?: string): string {
  if (isAbsolute(filePath)) {
    return filePath;
  } else if (root) {
    return join(root, filePath);
  } else {
    throw new Error('Relative path requires root option');
  }
}
