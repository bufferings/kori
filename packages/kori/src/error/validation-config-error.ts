import { KoriError } from './kori-error.js';

/**
 * Error thrown when request/response validation configuration is invalid.
 *
 * This wraps configuration-time problems (not per-request validation errors).
 *
 * @example
 * ```typescript
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
   * @param options.data - Arbitrary structured data for debugging
   * @param options.cause - Underlying error to preserve the cause chain
   */
  constructor(message: string, options: { data?: unknown; cause?: Error } = {}) {
    super(message, { ...options, code: 'VALIDATION_CONFIG_ERROR' });
  }
}
