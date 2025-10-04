/**
 * Options for generating Cache-Control headers.
 */
export type CacheOptions = {
  /**
   * Maximum age in seconds. Use 0 for no-cache behavior with ETag validation.
   */
  maxAge?: number;
  
  /**
   * Whether the resource is immutable (never changes).
   * When true, sets 'immutable' directive.
   */
  immutable?: boolean;
  
  /**
   * Whether to allow public caching (CDNs, proxies).
   * Defaults to true for static files.
   */
  public?: boolean;
  
  /**
   * Whether to require revalidation on each request.
   * When true, sets 'must-revalidate' directive.
   */
  mustRevalidate?: boolean;
};

/**
 * Creates a Cache-Control header value based on the provided options.
 * 
 * @param options - Cache configuration options
 * @returns Cache-Control header value
 * 
 * @example
 * ```typescript
 * // Long-term caching for immutable assets
 * createCacheControl({ maxAge: 31536000, immutable: true });
 * // 'public, max-age=31536000, immutable'
 * 
 * // Short-term caching with revalidation
 * createCacheControl({ maxAge: 3600, mustRevalidate: true });
 * // 'public, max-age=3600, must-revalidate'
 * 
 * // ETag-only validation (no caching)
 * createCacheControl({ maxAge: 0 });
 * // 'public, max-age=0'
 * ```
 */
export function createCacheControl(options: CacheOptions): string {
  const directives: string[] = [];
  
  // Default to public for static file serving
  const isPublic = options.public !== false;
  if (isPublic) {
    directives.push('public');
  } else {
    directives.push('private');
  }
  
  // Max-age directive
  if (typeof options.maxAge === 'number') {
    directives.push(`max-age=${options.maxAge}`);
  }
  
  // Immutable directive (for assets that never change)
  if (options.immutable) {
    directives.push('immutable');
  }
  
  // Must-revalidate directive
  if (options.mustRevalidate) {
    directives.push('must-revalidate');
  }
  
  return directives.join(', ');
}