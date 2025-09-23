/**
 * Unique identifier for a route.
 *
 * Opaque token for route identification; do not rely on its structure.
 */
export type KoriRouteId = symbol;

/**
 * Matched route information.
 *
 * Contains the route identifier and extracted path parameters.
 * Path parameters are derived from the route's path template during matching
 * (e.g. "/users/:id" with request "/users/123" -> { id: "123" }).
 *
 * @example
 * ```typescript
 * const match = matcher(request);
 * if (match) {
 *   // match.pathParams === { id: "123" }
 * }
 * ```
 */
export type KoriRouteMatch = {
  routeId: KoriRouteId;
  pathParams: Record<string, string>;
};

/**
 * Compiled matcher that returns a matched route or undefined.
 *
 * Path parameters in the returned match reflect the path template structure.
 * Method matching is case-insensitive.
 *
 * @param request - WHATWG Request to match
 * @returns Matched route or undefined when no route matches
 */
export type KoriCompiledRouteMatcher = (request: Request) => KoriRouteMatch | undefined;

/**
 * Route matcher collects routes and produces a compiled matcher.
 *
 * Implementers must ensure that path parameters in matches correspond
 * to the path template structure.
 */
export type KoriRouteMatcher = {
  /**
   * Register a route definition.
   *
   * @param options.method - HTTP method (case-insensitive)
   * @param options.path - Path template (e.g. "/users/:id")
   * @param options.routeId - Opaque route identifier issued by the registry
   */
  addRoute: (options: { method: string; path: string; routeId: KoriRouteId }) => void;

  /**
   * Finalize the matcher and return a compiled function to perform matching.
   * @returns Compiled matcher
   */
  compile: () => KoriCompiledRouteMatcher;
};
