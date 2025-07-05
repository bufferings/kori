// Request validation error types (field-first discriminated-union)

export type KoriRequestField = 'params' | 'queries' | 'headers' | 'body';

export type KoriBodyPreValidationErrorKind = 'UNSUPPORTED_MEDIA_TYPE' | 'INVALID_JSON';

export type KoriRequestFieldError<TValidatorError = unknown> =
  | {
      // Pre-validation error produced during body parsing
      field: 'body';
      stage: 'pre-validation';
      type: KoriBodyPreValidationErrorKind;
      message: string;
      // For UNSUPPORTED_MEDIA_TYPE
      supportedTypes?: string[];
      requestedType?: string;
      // For INVALID_JSON
      cause?: unknown;
    }
  | {
      // Schema validation error for any field
      field: KoriRequestField;
      stage: 'validation';
      error: TValidatorError;
    };

// The handler receives an array of field errors
export type KoriRequestValidationError<TValidatorError = unknown> = KoriRequestFieldError<TValidatorError>[];
