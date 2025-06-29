import { type HttpMethod } from '../kori/index.js';

/**
 * Converts an HttpMethod to its string representation.
 * For standard methods, returns the method as-is.
 * For custom methods, returns the custom string value.
 */
export function getMethodString(method: HttpMethod): string {
  return typeof method === 'string' ? method : method.custom;
}
