export type KoriFieldValidationError<ValidationError> = {
  stage: 'validation';
  error: ValidationError;
};

export type KoriBodyValidationError<TValidatorError> =
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
      type: 'INVALID_BODY';
      message: string;
      cause?: unknown;
    };

export type KoriRequestValidationError<TValidatorError = unknown> = {
  params?: KoriFieldValidationError<TValidatorError>;
  queries?: KoriFieldValidationError<TValidatorError>;
  headers?: KoriFieldValidationError<TValidatorError>;
  body?: KoriBodyValidationError<TValidatorError>;
};
