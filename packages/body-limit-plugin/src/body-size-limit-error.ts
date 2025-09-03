/**
 * Custom error class for body size limit exceeded
 * TODO: Consider extending KoriError instead of Error for framework consistency
 *       and add machine-readable error code (e.g., 'BODY_SIZE_LIMIT_EXCEEDED')
 */
export class BodySizeLimitError extends Error {
  public actualSize: number;
  public maxSize: number;

  constructor(options: { actualSize: number; maxSize: number; message?: string }) {
    const { actualSize, maxSize, message } = options;
    super(message ?? `Body size ${actualSize} exceeds limit ${maxSize}`);
    this.name = 'BodySizeLimitError';
    this.actualSize = actualSize;
    this.maxSize = maxSize;
    Object.setPrototypeOf(this, BodySizeLimitError.prototype);
  }
}
