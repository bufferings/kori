// Request validation error types (field-based object structure)

export type KoriRequestValidationError<TValidatorError = unknown> = {
  params?: {
    stage: 'validation';
    error: TValidatorError;
  };
  queries?: {
    stage: 'validation';
    error: TValidatorError;
  };
  headers?: {
    stage: 'validation';
    error: TValidatorError;
  };
  body?:
    | {
        stage: 'validation';
        error: TValidatorError;
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
        type: 'INVALID_JSON';
        message: string;
        cause?: unknown;
      };
};
