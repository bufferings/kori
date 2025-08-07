import { type HttpMethod } from '../kori/index.js';

/**
 * Converts an HttpMethod to its string representation.
 *
 * For standard HTTP methods (strings), returns the method as-is.
 * For custom methods (objects), extracts and returns the custom string value.
 * Used internally by Kori for HTTP method normalization.
 *
 * @param method - HTTP method to convert to string
 * @returns String representation of the HTTP method
 *
 * @example
 * ```typescript
 * // Standard HTTP methods
 * getMethodString('GET');     // -> 'GET'
 * getMethodString('POST');    // -> 'POST'
 *
 * // Custom HTTP method
 * getMethodString({ custom: 'CUSTOM' }); // -> 'CUSTOM'
 * ```
 */
export function getMethodString(method: HttpMethod): string {
  return typeof method === 'string' ? method : method.custom;
}
