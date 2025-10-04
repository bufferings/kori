/**
 * Path utilities for secure file operations.
 * 
 * These utilities help prevent path traversal attacks and normalize paths
 * for consistent file access across different platforms.
 */

/**
 * Normalizes a file path by removing redundant separators and resolving . and .. segments.
 * 
 * @param path - The path to normalize
 * @returns Normalized path
 * 
 * @example
 * ```typescript
 * normalizePath('./file.txt'); // 'file.txt'
 * normalizePath('dir/../file.txt'); // 'file.txt'
 * normalizePath('//double//slash'); // 'double/slash'
 * ```
 */
export function normalizePath(path: string): string {
  // Handle empty or root paths
  if (!path || path === '/') {
    return '';
  }
  
  // Remove leading slash and normalize separators
  const cleanPath = path.replace(/^\/+/, '').replace(/\\/g, '/');
  
  // Split into segments and resolve . and ..
  const segments: string[] = [];
  
  for (const segment of cleanPath.split('/')) {
    if (segment === '' || segment === '.') {
      continue; // Skip empty and current directory references
    } else if (segment === '..') {
      segments.pop(); // Go up one directory (even if empty - allows traversal)
    } else {
      segments.push(segment);
    }
  }
  
  return segments.join('/');
}

/**
 * Validates a path to ensure it's safe for file operations.
 * 
 * This function checks for common path traversal attack patterns
 * and ensures the path doesn't escape the intended directory.
 * 
 * @param path - The path to validate
 * @throws Error if the path is considered unsafe
 * 
 * @example
 * ```typescript
 * validatePath('safe/file.txt'); // OK
 * validatePath('../../../etc/passwd'); // Throws Error
 * validatePath('\0null-byte'); // Throws Error
 * ```
 */
export function validatePath(path: string): void {
  if (!path) {
    throw new Error('Path cannot be empty');
  }
  
  // Check for null bytes (directory traversal attack vector)
  if (path.includes('\0')) {
    throw new Error('Path cannot contain null bytes');
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\.[/\\]/, // Directory traversal
    /^[/\\]/, // Absolute path (starts with / or \)
    /^[a-zA-Z]:/, // Windows drive letter
    /\.\.$/, // Ends with ..
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(path)) {
      throw new Error(`Unsafe path detected: ${path}`);
    }
  }
  
  // Normalize and check if it would escape the root
  const normalized = normalizePath(path);
  if (normalized.startsWith('../') || normalized === '..') {
    throw new Error(`Path traversal detected: ${path}`);
  }
}

/**
 * Safely joins path segments, ensuring no path traversal occurs.
 * 
 * @param basePath - The base directory path
 * @param relativePath - The relative path to join
 * @returns Safely joined path
 * @throws Error if the resulting path would escape the base directory
 * 
 * @example
 * ```typescript
 * safeJoin('/var/www', 'public/index.html'); // '/var/www/public/index.html'
 * safeJoin('/var/www', '../etc/passwd'); // Throws Error
 * ```
 */
export function safeJoin(basePath: string, relativePath: string): string {
  if (!relativePath) {
    return basePath;
  }
  
  validatePath(relativePath);
  
  const normalized = normalizePath(relativePath);
  if (!normalized) {
    return basePath;
  }
  
  // Use URL constructor for safe path joining (works on all platforms)
  const baseUrl = new URL('file://' + basePath.replace(/\\/g, '/'));
  const joinedUrl = new URL(normalized, baseUrl.href + '/');
  
  // Extract the path and ensure it's within the base directory
  const joinedPath = decodeURIComponent(joinedUrl.pathname);
  const normalizedBasePath = basePath.replace(/\\/g, '/');
  
  if (!joinedPath.startsWith(normalizedBasePath)) {
    throw new Error(`Path would escape base directory: ${relativePath}`);
  }
  
  return joinedPath;
}