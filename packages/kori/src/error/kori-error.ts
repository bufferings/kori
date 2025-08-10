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
