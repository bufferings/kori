import { type CookieFailure } from '../http/index.js';

import { KoriError } from './kori-error.js';

/**
 * Error thrown when cookie validation fails.
 *
 * Wraps the lower-level CookieFailure and exposes it via the cookieFailure
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
 *     const cause = e.cookieFailure;
 *   }
 * }
 * ```
 */
export class KoriCookieError extends KoriError {
  public cookieFailure: CookieFailure;

  /**
   * Creates a KoriCookieError wrapping a CookieFailure.
   *
   * @param cookieFailure - Underlying cookie validation failure
   */
  constructor(cookieFailure: CookieFailure) {
    super(`Cookie operation failed: ${cookieFailure.message}`, {
      code: 'COOKIE_ERROR',
    });
    this.cookieFailure = cookieFailure;
  }
}
