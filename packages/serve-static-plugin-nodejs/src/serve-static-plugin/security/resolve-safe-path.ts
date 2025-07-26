import { resolve, normalize, relative, sep } from 'node:path';

export type ResolvedPath =
  | {
      isValid: true;
      safePath: string;
      isDotfile: boolean;
    }
  | {
      isValid: false;
    };

/**
 * Safely resolve a file path within the root directory
 * Prevents directory traversal attacks
 */
export function resolveSafePath(requestPath: string, rootDir: string): ResolvedPath {
  try {
    // Normalize and resolve paths
    const normalizedPath = normalize(requestPath);
    const resolvedRoot = resolve(rootDir);

    // Remove leading slash if present
    const pathWithoutLeadingSlash = normalizedPath.replace(/^\//, '');
    const resolvedPath = resolve(resolvedRoot, pathWithoutLeadingSlash);

    // Check if resolved path is within root directory
    const relativePath = relative(resolvedRoot, resolvedPath);
    const isValid = !relativePath.startsWith('..') && !relativePath.startsWith('/');

    if (!isValid) {
      return {
        isValid: false,
      };
    }

    // Check if it's a dotfile
    const isDotfile = normalizedPath.split(sep).some((segment) => segment.startsWith('.'));

    return {
      isValid: true,
      safePath: resolvedPath,
      isDotfile,
    };
  } catch {
    return {
      isValid: false,
    };
  }
}
