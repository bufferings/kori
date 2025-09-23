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
  if (prefix === '' && path === '') {
    return '/';
  }

  if (path === '') {
    return prefix.replace(/\/+$/, '/');
  }

  return prefix.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}

/**
 * Detects optional parameters that are not in the last segment (":name?/").
 *
 * @internal
 */
export function hasNonTrailingOptionalParam(path: string): boolean {
  return /:[A-Za-z0-9_]+(\{[^}]*\})?\?\//.test(path);
}
