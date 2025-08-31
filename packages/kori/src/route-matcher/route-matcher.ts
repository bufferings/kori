/**
 * Unique identifier for a registered route.
 *
 * Notes:
 * - Created by the internal route registry when a route is added.
 * - Opaque token for lookups; do not rely on its structure.
 */
export type KoriRouteId = symbol;

/**
 * Matched route information.
 *
 * Contract for implementers: pathParams must correspond to pathTemplate.
 * Conceptually this is PathParams<Path>, derived from tokens in pathTemplate
 * (e.g. "/users/:id" -> { id: string }).
 *
 * TypeScript cannot correlate a runtime string pathTemplate with a type
 * parameter in this design, so compile-time enforcement is not possible here.
 * Implementations must ensure the mapping at runtime.
 *
 * @example
 * ```typescript
 * const match = matcher(request);
 * if (match) {
 *   // match.pathTemplate === "/users/:id"
 *   // match.pathParams === { id: "123" }
 * }
 * ```
 */
export type KoriRouteMatch = {
  routeId: KoriRouteId;
  pathTemplate: string;
  pathParams: Record<string, string>;
};

/**
 * Compiled matcher that returns a matched route or undefined.
 *
 * The returned object's pathParams must reflect the pathTemplate shape.
 * Method matching is case-insensitive.
 *
 * @param request - WHATWG Request to match
 * @returns Matched route or undefined when no route matches
 */
export type KoriCompiledRouteMatcher = (request: Request) => KoriRouteMatch | undefined;

/**
 * Route matcher collects routes and produces a compiled matcher.
 *
 * Implementers must ensure that, for any produced match, pathParams are
 * consistent with the pathTemplate (as if typed by PathParams<typeof pathTemplate>).
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
