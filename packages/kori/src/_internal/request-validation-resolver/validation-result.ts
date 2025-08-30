/**
 * Validation error for individual request fields (params, queries, headers).
 *
 * @template ValidationError - Error type from the validation library
 */
export type KoriFieldValidationError<ValidationError> = {
  stage: 'validation';
  error: ValidationError;
};

/**
 * Validation error for request body with pre-validation and validation stages.
 *
 * @template TValidatorError - Error type from the validation library
 */
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

/**
 * Aggregated validation error for HTTP request components.
 *
 * Contains validation errors for params, queries, headers, and body.
 * Each field is optional and only present when validation fails.
 *
 * @template TValidatorError - Error type from the validation library
 */
export type KoriRequestValidationError<TValidatorError = unknown> = {
  params?: KoriFieldValidationError<TValidatorError>;
  queries?: KoriFieldValidationError<TValidatorError>;
  headers?: KoriFieldValidationError<TValidatorError>;
  body?: KoriBodyValidationError<TValidatorError>;
};

/**
 * Successful validation result containing validated data from all request components.
 */
export type KoriRequestValidationSuccess = {
  params: unknown;
  queries: unknown;
  headers: unknown;
  body: unknown;
};
