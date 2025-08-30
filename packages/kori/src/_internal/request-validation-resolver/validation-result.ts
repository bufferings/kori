/**
 * Validation error for individual request fields (params, queries, headers).
 *
 * @template ErrorType - Error type from the validation library
 */
export type FieldValidationError<ErrorType> = {
  stage: 'validation';
  error: ErrorType;
};

/**
 * Validation error for request body with pre-validation and validation stages.
 *
 * @template ErrorType - Error type from the validation library
 */
export type BodyValidationError<ErrorType> =
  | FieldValidationError<ErrorType>
  | {
      stage: 'pre-validation';
      type: 'UNSUPPORTED_MEDIA_TYPE';
      message: string;
      supportedTypes: string[];
      requestedType: string;
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
 * @template ErrorType - Error type from the validation library
 */
export type RequestValidationError<ErrorType = unknown> = {
  params?: FieldValidationError<ErrorType>;
  queries?: FieldValidationError<ErrorType>;
  headers?: FieldValidationError<ErrorType>;
  body?: BodyValidationError<ErrorType>;
};

/**
 * Default type alias for FieldValidationError with unknown error type.
 */
export type FieldValidationErrorDefault = FieldValidationError<unknown>;

/**
 * Default type alias for BodyValidationError with unknown error type.
 */
export type BodyValidationErrorDefault = BodyValidationError<unknown>;

/**
 * Default type alias for RequestValidationError with unknown error type.
 */
export type RequestValidationErrorDefault = RequestValidationError<unknown>;

/**
 * Successful validation result containing validated data from all request components.
 */
export type RequestValidationSuccess = {
  params: unknown;
  queries: unknown;
  headers: unknown;
  body: unknown;
};
