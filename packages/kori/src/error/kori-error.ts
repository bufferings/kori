export class KoriError extends Error {
  public readonly code?: string;
  public readonly data?: unknown;

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

export class KoriValidationConfigError extends KoriError {
  constructor(message: string, options?: { data?: unknown; cause?: Error }) {
    super(message, { ...options, code: 'VALIDATION_CONFIG_ERROR' });
  }
}
