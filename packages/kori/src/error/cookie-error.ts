import { type CookieError } from '../http/index.js';

import { KoriError } from './kori-error.js';

/**
 * Error thrown when cookie validation fails.
 *
 * Wraps the lower-level CookieError and exposes it via the cookieError
 * property. Typically thrown by response.setCookie/clearCookie.
 *
 * @example
 * ```typescript
 * try {
 *   // Example: __Host- cookies must not specify a Domain attribute
 *   res.setCookie('__Host-session', 'v', { domain: 'example.com' });
 * } catch (e) {
 *   if (e instanceof KoriCookieError) {
 *     // Inspect root cause
 *     const cause = e.cookieError;
 *   }
 * }
 * ```
 */
export class KoriCookieError extends KoriError {
  public cookieError: CookieError;

  /**
   * Creates a KoriCookieError wrapping a CookieError.
   *
   * @param cookieError - Underlying cookie validation error
   */
  constructor(cookieError: CookieError) {
    super(`Cookie operation failed: ${cookieError.message}`, {
      code: 'COOKIE_ERROR',
    });
    this.cookieError = cookieError;
  }
}
