/**
 * Successful validation result containing validated data from all request components.
 */
export type RequestValidationSuccess = {
  params: unknown;
  queries: unknown;
  headers: unknown;
  body: unknown;
};

/**
 * Failure shape for the validation stage across request components.
 *
 * For body, this shape is used only at the schema validation stage
 * via RequestBodyValidationFailure.
 *
 * @template FailureReason - Failure reason type from the validation library
 */
export type RequestFieldValidationFailure<FailureReason> = {
  stage: 'validation';
  reason: FailureReason;
};

export type RequestFieldValidationFailureBase = RequestFieldValidationFailure<unknown>;

/**
 * Validation failure for request body.
 *
 * Covers both pre-validation failures (media type mismatch, body parsing)
 * and validation failures (schema validation). Pre-validation occurs before
 * schema validation. Intended for failure handlers to decide responses and logging.
 *
 * @template FailureReason - Failure reason type from the validation library
 */
export type RequestBodyValidationFailure<FailureReason> =
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
      requestMediaType: string;
    }
  | {
      stage: 'pre-validation';
      type: 'INVALID_BODY';
      message: string;
      cause?: unknown;
    }
  | RequestFieldValidationFailure<FailureReason>;

export type RequestBodyValidationFailureBase = RequestBodyValidationFailure<unknown>;

/**
 * Aggregated validation failure for HTTP request components.
 *
 * Contains validation failures for different parts of the HTTP request.
 * Each field is optional and only present when validation fails for that
 * component. Failure handlers can inspect specific fields to provide
 * targeted failure responses.
 *
 * @template FailureReason - Failure reason type from the validation library
 */
export type RequestValidationFailure<FailureReason> = {
  params?: RequestFieldValidationFailure<FailureReason>;
  queries?: RequestFieldValidationFailure<FailureReason>;
  headers?: RequestFieldValidationFailure<FailureReason>;
  body?: RequestBodyValidationFailure<FailureReason>;
};

export type RequestValidationFailureBase = RequestValidationFailure<unknown>;
