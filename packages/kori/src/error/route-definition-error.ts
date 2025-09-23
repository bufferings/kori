import { KoriError } from './kori-error.js';

/**
 * Error thrown when a route definition violates Kori routing rules.
 */
export class KoriRouteDefinitionError extends KoriError {
  /**
   * Creates a KoriRouteDefinitionError with code "ROUTE_DEFINITION_ERROR".
   *
   * @param message - Description of the configuration problem
   * @param options.method - The HTTP method for the route
   * @param options.path - The problematic route path
   */
  constructor(message: string, options: { method: string; path: string }) {
    super(message, {
      code: 'ROUTE_DEFINITION_ERROR',
      data: { method: options.method, path: options.path },
    });
  }
}
