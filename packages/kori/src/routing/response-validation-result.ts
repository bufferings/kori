/**
 * Successful validation result containing validated data from response components.
 */
export type ResponseValidationSuccess = {
  body: unknown;
};

/**
 * Validation failure for response status code resolution.
 *
 * Occurs when no response schema is defined for the actual status code.
 */
export type ResponseStatusCodeValidationFailure = {
  type: 'NO_SCHEMA_FOR_STATUS_CODE';
  message: string;
  statusCode: number;
};

/**
 * Validation failure for response body.
 *
 * Covers both pre-validation failures (media type mismatch) and validation
 * failures (schema validation). Pre-validation occurs before schema validation.
 *
 * @template FailureReason - Failure reason type from the validation library
 */
export type ResponseBodyValidationFailure<FailureReason> =
  | {
      stage: 'pre-validation';
      type: 'MISSING_CONTENT_TYPE';
      message: string;
    }
  | {
      stage: 'pre-validation';
      type: 'UNSUPPORTED_MEDIA_TYPE';
      message: string;
      supportedMediaTypes: string[];
      responseMediaType: string;
    }
  | {
      stage: 'validation';
      reason: FailureReason;
    };

export type ResponseBodyValidationFailureBase = ResponseBodyValidationFailure<unknown>;

/**
 * Aggregated validation failure for HTTP response components.
 *
 * Contains validation failures for different parts of the HTTP response.
 * Each field is optional and only present when validation fails for that
 * component. Failure handlers can inspect specific fields to provide
 * targeted failure responses.
 *
 * @template FailureReason - Failure reason type from the validation library
 */
export type ResponseValidationFailure<FailureReason> = {
  statusCode?: ResponseStatusCodeValidationFailure;
  body?: ResponseBodyValidationFailure<FailureReason>;
};

export type ResponseValidationFailureBase = ResponseValidationFailure<unknown>;
