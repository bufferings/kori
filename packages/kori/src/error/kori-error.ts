import { type CookieError } from '../http/index.js';

/**
 * Base error type for Kori.
 *
 * Carries an optional machine-readable code and arbitrary data for
 * diagnostics. Supports error cause chaining.
 *
 * @example
 * ```ts
 * try {
 *   throw new Error('low-level');
 * } catch (cause) {
 *   throw new KoriError('high-level context', {
 *     code: 'SOMETHING_FAILED',
 *     data: { step: 2 },
 *     cause: cause as Error,
 *   });
 * }
 * ```
 */
export class KoriError extends Error {
  public readonly code?: string;
  public readonly data?: unknown;

  /**
   * Creates a KoriError.
   *
   * @param message - Human-readable error message
   * @param options - Optional details
   * @param options.code - Machine-readable error code
   * @param options.data - Arbitrary structured data for debugging
   * @param options.cause - Underlying error to preserve the cause chain
   */
  constructor(message: string, options?: { code?: string; data?: unknown; cause?: Error }) {
    super(message);
    this.name = new.target.name;
    this.code = options?.code;
    this.data = options?.data;

    if (options?.cause) {
      this.cause = options.cause;
    }

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when request/response validation configuration is invalid.
 *
 * This wraps configuration-time problems (not per-request validation errors).
 *
 * @example
 * ```ts
 * // When constructing a validator with invalid configuration:
 * throw new KoriValidationConfigError('invalid schema mapping', {
 *   data: { provider: 'zod', reason: 'missing content type' },
 * });
 * ```
 */
export class KoriValidationConfigError extends KoriError {
  /**
   * Creates a KoriValidationConfigError with code "VALIDATION_CONFIG_ERROR".
   *
   * @param message - Description of the configuration problem
   * @param options - Optional details
   * @param options.data - Arbitrary structured data for debugging
   * @param options.cause - Underlying error to preserve the cause chain
   */
  constructor(message: string, options?: { data?: unknown; cause?: Error }) {
    super(message, { ...options, code: 'VALIDATION_CONFIG_ERROR' });
  }
}

/**
 * Error thrown when cookie validation fails.
 *
 * Wraps the lower-level CookieError and exposes it via the cookieError
 * property. Typically thrown by response.setCookie/clearCookie.
 *
 * @example
 * ```ts
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
  public readonly cookieError: CookieError;

  /**
   * Creates a KoriCookieError wrapping a CookieError.
   *
   * @param cookieError - Underlying cookie validation error
   */
  constructor(cookieError: CookieError) {
    super(`Cookie operation failed: ${cookieError.message}`, {
      code: 'COOKIE_ERROR',
      data: cookieError,
    });
    this.cookieError = cookieError;
  }
}

/**
 * Error thrown when attempting to set the "set-cookie" header directly.
 *
 * Kori guards "set-cookie" to ensure validation and correct multi-header
 * emission. Use res.setCookie/clearCookie instead.
 *
 * @example
 * ```ts
 * // Do not do this:
 * res.setHeader('set-cookie', 'sid=1; Path=/');
 * // It will throw KoriSetCookieHeaderError. Use setCookie instead:
 * res.setCookie('sid', '1', { path: '/' });
 * ```
 */
export class KoriSetCookieHeaderError extends KoriError {
  /**
   * Creates a KoriSetCookieHeaderError with code "SET_COOKIE_HEADER_GUARD".
   */
  constructor() {
    super('set-cookie must use setCookie/clearCookie', {
      code: 'SET_COOKIE_HEADER_GUARD',
    });
  }
}
