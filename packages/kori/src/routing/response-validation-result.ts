/**
 * Validation error for response status code resolution.
 *
 * Occurs when no response schema is defined for the actual response status code.
 * Helps identify missing schema definitions in response schema configuration.
 *
 * @example
 * ```typescript
 * // Schema only defines 200, but handler returns 201
 * const statusError: ResponseStatusCodeValidationError = {
 *   type: 'NO_SCHEMA_FOR_STATUS_CODE',
 *   message: 'No schema defined for status code 201',
 *   statusCode: 201
 * };
 * ```
 */
export type ResponseStatusCodeValidationError = {
  type: 'NO_SCHEMA_FOR_STATUS_CODE';
  message: string;
  statusCode: number;
};

/**
 * Validation error for response body with comprehensive error scenarios.
 *
 * Covers both pre-validation failures (content-type issues) and validation
 * failures (schema validation). Pre-validation errors occur when the response
 * content type doesn't match expected types in the schema.
 *
 * @template ErrorType - Error type from the validation library
 *
 * @example
 * ```typescript
 * // Schema validation error
 * const validationError: ResponseBodyValidationError<ValidationError> = {
 *   stage: 'validation',
 *   error: schemaValidationError
 * };
 *
 * // Unsupported response content type
 * const mediaTypeError: ResponseBodyValidationError<never> = {
 *   stage: 'pre-validation',
 *   type: 'UNSUPPORTED_MEDIA_TYPE',
 *   message: 'Response content type not supported',
 *   supportedTypes: ['application/json'],
 *   responseType: 'text/plain'
 * };
 * ```
 */
export type ResponseBodyValidationError<ErrorType> =
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
 * Contains validation errors for different parts of the HTTP response.
 * Each field is optional and only present when validation fails for that
 * component. Error handlers can inspect specific fields to provide
 * appropriate error responses or logging.
 *
 * @template ErrorType - Error type from the validation library
 *
 * @example
 * ```typescript
 * const errorHandler = (ctx, err: ResponseValidationError<ValidationError>) => {
 *   if (err.statusCode) {
 *     ctx.log().warn('Missing response schema', {
 *       statusCode: err.statusCode.statusCode,
 *       message: err.statusCode.message
 *     });
 *   }
 *
 *   if (err.body?.stage === 'pre-validation') {
 *     ctx.log().error('Response content type mismatch', { err: err.body });
 *   }
 *
 *   // Return void to keep original response
 *   return;
 * };
 * ```
 */
export type ResponseValidationError<ErrorType = unknown> = {
  statusCode?: ResponseStatusCodeValidationError;
  body?: ResponseBodyValidationError<ErrorType>;
};

/**
 * Default type alias for BodyValidationError with unknown error type.
 */
export type ResponseBodyValidationErrorDefault = ResponseBodyValidationError<unknown>;

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
