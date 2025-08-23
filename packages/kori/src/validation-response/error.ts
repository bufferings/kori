export type KoriResponseBodyValidationError<ValidationError> =
  | {
      stage: 'validation';
      error: ValidationError;
    }
  | {
      stage: 'pre-validation';
      type: 'UNSUPPORTED_MEDIA_TYPE';
      message: string;
      supportedTypes: string[];
      requestedType?: string;
    }
  | {
      stage: 'pre-validation';
      type: 'INVALID_BODY';
      message: string;
      cause?: unknown;
    }
  | {
      stage: 'pre-validation';
      type: 'UNKNOWN_ERROR';
      message: string;
      cause?: unknown;
    };

export type KoriResponseValidationError<ValidationError = unknown> = {
  body?: KoriResponseBodyValidationError<ValidationError>;
};
