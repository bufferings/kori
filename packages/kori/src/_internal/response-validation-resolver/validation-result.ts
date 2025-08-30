/**
 * Validation error for response status code resolution.
 */
export type StatusCodeValidationError = {
  type: 'NO_SCHEMA_FOR_STATUS_CODE';
  message: string;
  statusCode: number;
};

/**
 * Validation error for response body with pre-validation and validation stages.
 *
 * @template ErrorType - Error type from the validation library
 */
export type BodyValidationError<ErrorType> =
  | {
      stage: 'validation';
      error: ErrorType;
    }
  | {
      stage: 'pre-validation';
      type: 'UNSUPPORTED_MEDIA_TYPE';
      message: string;
      supportedTypes: string[];
      responseType: string;
    };

/**
 * Aggregated validation error for HTTP response components.
 *
 * Contains validation errors for status code resolution and response body.
 * Each field is optional and only present when validation fails.
 *
 * @template ErrorType - Error type from the validation library
 */
export type ResponseValidationError<ErrorType = unknown> = {
  statusCode?: StatusCodeValidationError;
  body?: BodyValidationError<ErrorType>;
};

/**
 * Default type alias for BodyValidationError with unknown error type.
 */
export type BodyValidationErrorDefault = BodyValidationError<unknown>;

/**
 * Default type alias for ResponseValidationError with unknown error type.
 */
export type ResponseValidationErrorDefault = ResponseValidationError<unknown>;

/**
 * Successful validation result containing validated data from response components.
 */
export type ResponseValidationSuccess = {
  body: unknown;
};
