/**
 * Joins two path segments with proper slash normalization.
 *
 * Handles common prefix/path combination issues:
 * - Removes duplicate slashes: '/api/' + '/users' becomes '/api/users'
 * - Adds missing slashes: '/api' + 'users' becomes '/api/users'
 * - Normalizes empty paths: '' + 'users' becomes '/users'
 * - Returns root path for empty inputs: '' + '' becomes '/'
 *
 * @param prefix - The path prefix (can be empty)
 * @param path - The path to append
 * @returns Normalized joined path
 * @internal
 */
export function joinPaths(prefix: string, path: string): string {
  // Handle both empty case as root path
  if (!prefix && !path) {
    return '/';
  }

  // If prefix is empty, normalize path
  if (!prefix) {
    return path.startsWith('/') ? path : '/' + path;
  }

  // If path is empty, return prefix as is
  if (!path) {
    return prefix;
  }

  // Normalize prefix (remove trailing slash) and path (ensure leading slash)
  const normalizedPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  const normalizedPath = path.startsWith('/') ? path : '/' + path;

  return normalizedPrefix + normalizedPath;
}
