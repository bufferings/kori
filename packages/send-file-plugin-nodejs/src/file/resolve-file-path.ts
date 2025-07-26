import { isAbsolute, resolve, normalize, relative } from 'node:path';

/**
 * Resolve file path with optional root directory
 * Supports both absolute and relative paths cross-platform
 * Prevents path traversal attacks when root is specified
 */
export function resolveFilePath(filePath: string, root?: string): string {
  if (isAbsolute(filePath)) {
    return filePath;
  } else if (root) {
    // Normalize and resolve paths
    const normalizedPath = normalize(filePath);
    const resolvedRoot = resolve(root);

    // Remove leading slash if present
    const pathWithoutLeadingSlash = normalizedPath.replace(/^\//, '');
    const resolvedPath = resolve(resolvedRoot, pathWithoutLeadingSlash);

    // Check if resolved path is within root directory
    const relativePath = relative(resolvedRoot, resolvedPath);
    const isValid = !relativePath.startsWith('..') && !relativePath.startsWith('/');

    if (!isValid) {
      throw new Error(`Path traversal attempt detected for '${filePath}'`);
    }

    return resolvedPath;
  } else {
    throw new Error(`Relative path '${filePath}' requires root option`);
  }
}
