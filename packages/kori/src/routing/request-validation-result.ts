/**
 * Validation error for individual request fields (params, queries, headers).
 *
 * Represents validation failures during schema validation stage for simple
 * request components. Contains the underlying error from the validation library.
 *
 * @template ErrorType - Error type from the validation library
 *
 * @example
 * ```typescript
 * // Example error structure
 * const fieldError: RequestFieldValidationError<ValidationError> = {
 *   stage: 'validation',
 *   error: validationLibraryError
 * };
 * ```
 */
export type RequestFieldValidationError<ErrorType> = {
  stage: 'validation';
  error: ErrorType;
};

/**
 * Validation error for request body with comprehensive error scenarios.
 *
 * Covers both pre-validation failures (content-type issues, body parsing)
 * and validation failures (schema validation). Pre-validation errors occur
 * before schema validation and provide detailed context for debugging.
 *
 * @template ErrorType - Error type from the validation library
 *
 * @example
 * ```typescript
 * // Schema validation error
 * const validationError: RequestBodyValidationError<ValidationError> = {
 *   stage: 'validation',
 *   error: schemaValidationError
 * };
 *
 * // Unsupported content type
 * const mediaTypeError: RequestBodyValidationError<never> = {
 *   stage: 'pre-validation',
 *   type: 'UNSUPPORTED_MEDIA_TYPE',
 *   message: 'Content-Type not supported',
 *   supportedTypes: ['application/json'],
 *   requestType: 'text/plain'
 * };
 * ```
 */
export type RequestBodyValidationError<ErrorType> =
  | RequestFieldValidationError<ErrorType>
  | {
      stage: 'pre-validation';
      type: 'UNSUPPORTED_MEDIA_TYPE';
      message: string;
      supportedTypes: string[];
      requestType: string;
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
 * Contains validation errors for different parts of the HTTP request.
 * Each field is optional and only present when validation fails for that
 * component. Error handlers can inspect specific fields to provide
 * targeted error responses.
 *
 * @template ErrorType - Error type from the validation library
 *
 * @example
 * ```typescript
 * const errorHandler = (ctx, err: RequestValidationError<ValidationError>) => {
 *   if (err.body?.stage === 'pre-validation' && err.body.type === 'UNSUPPORTED_MEDIA_TYPE') {
 *     return ctx.res.unsupportedMediaType();
 *   }
 *
 *   if (err.params) {
 *     return ctx.res.badRequest({ message: 'Invalid path parameters' });
 *   }
 *
 *   return ctx.res.badRequest({ message: 'Validation failed' });
 * };
 * ```
 */
export type RequestValidationError<ErrorType = unknown> = {
  params?: RequestFieldValidationError<ErrorType>;
  queries?: RequestFieldValidationError<ErrorType>;
  headers?: RequestFieldValidationError<ErrorType>;
  body?: RequestBodyValidationError<ErrorType>;
};

/**
 * Default type alias for FieldValidationError with unknown error type.
 */
export type RequestFieldValidationErrorDefault = RequestFieldValidationError<unknown>;

/**
 * Default type alias for BodyValidationError with unknown error type.
 */
export type RequestBodyValidationErrorDefault = RequestBodyValidationError<unknown>;

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
