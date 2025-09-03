import { KoriError } from './kori-error.js';

/**
 * Error thrown when attempting to set the "set-cookie" header directly.
 *
 * Kori guards "set-cookie" to ensure validation and correct multi-header
 * emission. Use res.setCookie/clearCookie instead.
 *
 * @example
 * ```typescript
 * // Do not do this:
 * res.setHeader('set-cookie', 'sid=1; Path=/');
 * // It will throw KoriSetCookieHeaderError. Use setCookie instead:
 * res.setCookie('sid', '1', { path: '/' });
 * ```
 */
export class KoriSetCookieHeaderError extends KoriError {
  /**
   * Creates a KoriSetCookieHeaderError with code "SET_COOKIE_HEADER_ERROR".
   */
  constructor() {
    super('set-cookie must use setCookie/clearCookie', {
      code: 'SET_COOKIE_HEADER_ERROR',
    });
  }
}
