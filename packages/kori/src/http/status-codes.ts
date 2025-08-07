/**
 * HTTP Status Codes
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
 */
export const HttpStatus = {
  CONTINUE: 100,
  SWITCHING_PROTOCOLS: 101,
  PROCESSING: 102,
  EARLY_HINTS: 103,
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  RESET_CONTENT: 205,
  PARTIAL_CONTENT: 206,
  MULTIPLE_CHOICES: 300,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  SEE_OTHER: 303,
  NOT_MODIFIED: 304,
  TEMPORARY_REDIRECT: 307,
  PERMANENT_REDIRECT: 308,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RANGE_NOT_SATISFIABLE: 416,
  UNPROCESSABLE_CONTENT: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Union type for HTTP status codes.
 *
 * Includes all predefined status codes from HttpStatus plus any custom
 * status codes as numbers. The `number` fallback allows for non-standard
 * or emerging status codes while maintaining TypeScript autocompletion
 * for well-known status codes.
 *
 * @example
 * ```typescript
 * // Using predefined status codes
 * const successStatus: HttpStatusCode = HttpStatus.OK;          // 200
 * const notFoundStatus: HttpStatusCode = HttpStatus.NOT_FOUND;  // 404
 *
 * // Using custom or emerging status codes
 * const customStatus: HttpStatusCode = 299;  // Custom 2xx status
 * const earlyHints: HttpStatusCode = 103;    // Newer status code
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus] | number;
