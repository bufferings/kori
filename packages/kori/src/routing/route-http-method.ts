/**
 * HTTP request methods supported by Kori routing.
 *
 * Supports standard HTTP methods and custom methods via the `custom` property.
 * Custom methods must be uppercase strings for HTTP specification compliance.
 * Method matching is case-insensitive during route resolution.
 *
 * @example
 * ```typescript
 * // Standard HTTP methods
 * app.route({ method: 'GET', path: '/users', handler: getUsersHandler });
 * app.route({ method: 'POST', path: '/users', handler: createUserHandler });
 *
 * // Custom HTTP method
 * app.route({ method: { custom: 'PURGE' }, path: '/cache', handler: purgeHandler });
 * ```
 */
export type RouteHttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'
  | { custom: Uppercase<string> };

/**
 * Normalizes a route HTTP method to its string representation.
 *
 * Converts both standard string methods and custom method objects to
 * their string form for internal route processing and matching.
 *
 * @param method - HTTP method to normalize
 * @returns String representation of the HTTP method
 *
 * @example
 * ```typescript
 * normalizeRouteHttpMethod('GET'); // 'GET'
 * normalizeRouteHttpMethod({ custom: 'PURGE' }); // 'PURGE'
 * ```
 */
export function normalizeRouteHttpMethod(method: RouteHttpMethod): string {
  return typeof method === 'string' ? method : method.custom;
}
