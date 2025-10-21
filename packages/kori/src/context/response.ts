import { KoriCookieError, KoriResponseBuildError, KoriSetCookieHeaderError } from '../error/index.js';
import {
  HttpStatus,
  type HttpStatusCode,
  type HttpResponseHeaderName,
  HttpResponseHeader,
  ContentType,
  type CookieOptions,
  serializeCookie,
  deleteCookie,
} from '../http/index.js';

import { type KoriRequest } from './request.js';

/**
 * Options for customizing error responses.
 */
export type ErrorResponseOptions = {
  /** Custom error message (overrides default message) */
  message?: string;
  /** Application-specific error code */
  code?: string;
  /** Additional error details (any format) */
  details?: unknown;
  /** Any additional custom fields */
  [key: string]: unknown;
};

/**
 * Kori response object for building HTTP responses with method chaining.
 */
export type KoriResponse = {
  koriKind: 'kori-response';

  /**
   * Sets the HTTP status code.
   *
   * @param statusCode - HTTP status code to set
   * @returns The same response instance for method chaining
   */
  status(statusCode: HttpStatusCode): KoriResponse;

  /**
   * Sets a response header, replacing any existing value.
   *
   * Header names are normalized to lowercase (Content-Type becomes content-type).
   *
   * Note: 'set-cookie' header is not allowed via this API. Use setCookie/clearCookie instead.
   *
   * @param name - Header name
   * @param value - Header value
   * @returns The same response instance for method chaining
   * @throws {KoriSetCookieHeaderError} When name is 'set-cookie'
   */
  setHeader(name: HttpResponseHeaderName, value: string): KoriResponse;

  /**
   * Appends a value to a response header.
   *
   * Header names are normalized to lowercase (Content-Type becomes content-type).
   *
   * Note: 'set-cookie' header is not allowed via this API. Use setCookie/clearCookie instead.
   *
   * @param name - Header name
   * @param value - Header value to append
   * @returns The same response instance for method chaining
   * @throws {KoriSetCookieHeaderError} When name is 'set-cookie'
   */
  appendHeader(name: HttpResponseHeaderName, value: string): KoriResponse;

  /**
   * Removes a response header.
   *
   * Header names are normalized to lowercase (Content-Type becomes content-type).
   *
   * Note: When name is 'set-cookie', removes all pending set-cookie headers at once.
   * Individual cookie removal is not supported; use clearCookie(name, scope) to instruct
   * clients to delete a specific cookie.
   *
   * @param name - Header name to remove
   * @returns The same response instance for method chaining
   */
  removeHeader(name: HttpResponseHeaderName): KoriResponse;

  /**
   * Sets a cookie in the response.
   *
   * Cookie names are case-sensitive (sessionId and SessionId are different cookies).
   *
   * Note: The 'set-cookie' header is guarded in setHeader/appendHeader. Cookies must be
   * managed via setCookie/clearCookie to ensure validation and correct multi-header emission.
   *
   * @param name - Cookie name
   * @param value - Cookie value
   * @param options - Cookie options (path, domain, secure, etc.)
   * @returns The same response instance for method chaining
   * @throws {KoriCookieError} When cookie validation fails (invalid name, prefix constraints, age limits, etc.)
   */
  setCookie(name: string, value: string, options?: CookieOptions): KoriResponse;

  /**
   * Clears a cookie by setting it to expire.
   *
   * Cookie names are case-sensitive (sessionId and SessionId are different cookies).
   *
   * Note: The 'set-cookie' header is guarded in setHeader/appendHeader. Cookies must be
   * managed via setCookie/clearCookie to ensure validation and correct multi-header emission.
   *
   * @param name - Cookie name to clear
   * @param options - Cookie options for path and domain matching
   * @returns The same response instance for method chaining
   * @throws {KoriCookieError} When cookie name validation fails (invalid characters, RFC 6265 non-compliance, etc.)
   */
  clearCookie(name: string, options?: Pick<CookieOptions, 'path' | 'domain'>): KoriResponse;

  /**
   * Sets the response body to JSON with application/json content-type header.
   *
   * @param body - Object to serialize as JSON
   * @returns The same response instance for method chaining
   */
  json<T>(body: T): KoriResponse;

  /**
   * Sets the response body to plain text with text/plain content-type header.
   *
   * @param body - Text content
   * @returns The same response instance for method chaining
   */
  text(body: string): KoriResponse;

  /**
   * Sets the response body to HTML with text/html content-type header.
   *
   * @param body - HTML content
   * @returns The same response instance for method chaining
   */
  html(body: string): KoriResponse;

  /**
   * Sets the response to have no body content.
   *
   * Uses HTTP status 204 No Content by default.
   * No content-type header is set for empty responses.
   *
   * @returns The same response instance for method chaining
   */
  empty(): KoriResponse;

  /**
   * Sets the response body to a readable stream with application/octet-stream content-type header.
   *
   * @param body - ReadableStream for the response body
   * @returns The same response instance for method chaining
   */
  stream(body: ReadableStream): KoriResponse;

  /**
   * Creates a 400 Bad Request error response.
   *
   * @param options - Error response options (message, code, details, and custom fields)
   * @returns The same response instance for method chaining
   *
   * @example
   * ```typescript
   * // Default message
   * res.badRequest();
   * // -> {
   * //      "error": {
   * //        "type": "BAD_REQUEST",
   * //        "message": "Bad Request"
   * //      }
   * //    }
   *
   * // Custom message and fields
   * res.badRequest({ message: "Invalid email format", field: "email", userId: "123" });
   * // -> {
   * //      "error": {
   * //        "type": "BAD_REQUEST",
   * //        "message": "Invalid email format",
   * //        "field": "email",
   * //        "userId": "123"
   * //      }
   * //    }
   * ```
   */
  badRequest(options?: ErrorResponseOptions): KoriResponse;

  /**
   * Creates a 401 Unauthorized error response.
   *
   * @param options - Error response options (message, code, details, and custom fields)
   * @returns The same response instance for method chaining
   *
   * @example
   * ```typescript
   * // Default message
   * res.unauthorized();
   * // -> {
   * //      "error": {
   * //        "type": "UNAUTHORIZED",
   * //        "message": "Unauthorized"
   * //      }
   * //    }
   *
   * // Custom message and fields
   * res.unauthorized({ message: "Invalid token", sessionId: "abc123", expired: true });
   * // -> {
   * //      "error": {
   * //        "type": "UNAUTHORIZED",
   * //        "message": "Invalid token",
   * //        "sessionId": "abc123",
   * //        "expired": true
   * //      }
   * //    }
   * ```
   */
  unauthorized(options?: ErrorResponseOptions): KoriResponse;

  /**
   * Creates a 403 Forbidden error response.
   *
   * @param options - Error response options (message, code, details, and custom fields)
   * @returns The same response instance for method chaining
   *
   * @example
   * ```typescript
   * // Default message
   * res.forbidden();
   * // -> {
   * //      "error": {
   * //        "type": "FORBIDDEN",
   * //        "message": "Forbidden"
   * //      }
   * //    }
   *
   * // Custom message and fields
   * res.forbidden({ message: "Insufficient permissions", resource: "user:123", action: "delete" });
   * // -> {
   * //      "error": {
   * //        "type": "FORBIDDEN",
   * //        "message": "Insufficient permissions",
   * //        "resource": "user:123",
   * //        "action": "delete"
   * //      }
   * //    }
   * ```
   */
  forbidden(options?: ErrorResponseOptions): KoriResponse;

  /**
   * Creates a 404 Not Found error response.
   *
   * @param options - Error response options (message, code, details, and custom fields)
   * @returns The same response instance for method chaining
   *
   * @example
   * ```typescript
   * // Default message
   * res.notFound();
   * // -> {
   * //      "error": {
   * //        "type": "NOT_FOUND",
   * //        "message": "Not Found"
   * //      }
   * //    }
   *
   * // Custom message and fields
   * res.notFound({ message: "User not found", resourceId: "user-123", resourceType: "User" });
   * // -> {
   * //      "error": {
   * //        "type": "NOT_FOUND",
   * //        "message": "User not found",
   * //        "resourceId": "user-123",
   * //        "resourceType": "User"
   * //      }
   * //    }
   * ```
   */
  notFound(options?: ErrorResponseOptions): KoriResponse;

  /**
   * Creates a 405 Method Not Allowed error response.
   *
   * @param options - Error response options (message, code, details, and custom fields)
   * @returns The same response instance for method chaining
   *
   * @example
   * ```typescript
   * // Default message
   * res.methodNotAllowed();
   * // -> {
   * //      "error": {
   * //        "type": "METHOD_NOT_ALLOWED",
   * //        "message": "Method Not Allowed"
   * //      }
   * //    }
   *
   * // Custom message and fields
   * res.methodNotAllowed({ message: "POST not allowed", allowed: ["GET", "PUT"], endpoint: "/api/users" });
   * // -> {
   * //      "error": {
   * //        "type": "METHOD_NOT_ALLOWED",
   * //        "message": "POST not allowed",
   * //        "allowed": ["GET", "PUT"],
   * //        "endpoint": "/api/users"
   * //      }
   * //    }
   * ```
   */
  methodNotAllowed(options?: ErrorResponseOptions): KoriResponse;

  /**
   * Creates a 415 Unsupported Media Type error response.
   *
   * @param options - Error response options (message, code, details, and custom fields)
   * @returns The same response instance for method chaining
   *
   * @example
   * ```typescript
   * // Default message
   * res.unsupportedMediaType();
   * // -> {
   * //      "error": {
   * //        "type": "UNSUPPORTED_MEDIA_TYPE",
   * //        "message": "Unsupported Media Type"
   * //      }
   * //    }
   *
   * // Custom message and fields
   * res.unsupportedMediaType({ message: "JSON required", expected: "application/json", received: "text/plain" });
   * // -> {
   * //      "error": {
   * //        "type": "UNSUPPORTED_MEDIA_TYPE",
   * //        "message": "JSON required",
   * //        "expected": "application/json",
   * //        "received": "text/plain"
   * //      }
   * //    }
   * ```
   */
  unsupportedMediaType(options?: ErrorResponseOptions): KoriResponse;

  /**
   * Creates a 408 Request Timeout error response.
   *
   * @param options - Error response options (message, code, details, and custom fields)
   * @returns The same response instance for method chaining
   *
   * @example
   * ```typescript
   * // Default message
   * res.timeout();
   * // -> {
   * //      "error": {
   * //        "type": "TIMEOUT",
   * //        "message": "Request Timeout"
   * //      }
   * //    }
   *
   * // Custom message and fields
   * res.timeout({ message: "Operation timed out", operation: "database_query", timeoutMs: 5000 });
   * // -> {
   * //      "error": {
   * //        "type": "TIMEOUT",
   * //        "message": "Operation timed out",
   * //        "operation": "database_query",
   * //        "timeoutMs": 5000
   * //      }
   * //    }
   * ```
   */
  timeout(options?: ErrorResponseOptions): KoriResponse;

  /**
   * Creates a 500 Internal Server Error response.
   *
   * @param options - Error response options (message, code, details, and custom fields)
   * @returns The same response instance for method chaining
   *
   * @example
   * ```typescript
   * // Default message
   * res.internalError();
   * // -> {
   * //      "error": {
   * //        "type": "INTERNAL_SERVER_ERROR",
   * //        "message": "Internal Server Error"
   * //      }
   * //    }
   *
   * // Custom message and fields
   * res.internalError({ message: "Database connection failed", errorId: "err_001", operation: "user_lookup" });
   * // -> {
   * //      "error": {
   * //        "type": "INTERNAL_SERVER_ERROR",
   * //        "message": "Database connection failed",
   * //        "errorId": "err_001",
   * //        "operation": "user_lookup"
   * //      }
   * //    }
   * ```
   */
  internalError(options?: ErrorResponseOptions): KoriResponse;

  /**
   * Gets the final HTTP status code that will be used.
   *
   * @returns HTTP status code (defaults to 200 OK)
   */
  getStatus(): HttpStatusCode;

  /**
   * Gets a copy of the response headers.
   *
   * @returns New Headers object with current response headers
   */
  getHeadersCopy(): Headers;

  /**
   * Gets a specific response header value.
   *
   * Header names are normalized to lowercase (Content-Type becomes content-type).
   *
   * @param name - Header name
   * @returns Header value or undefined if not set
   */
  getHeader(name: HttpResponseHeaderName): string | undefined;

  /**
   * Gets the content-type header value.
   *
   * @returns content-type value or undefined if not set
   */
  getContentType(): string | undefined;

  /**
   * Gets the media type from content-type header (without parameters).
   *
   * @returns media type or undefined if content-type not set
   */
  getMediaType(): string | undefined;

  /**
   * Gets the response body content.
   *
   * @returns The body content
   */
  getBody(): unknown;

  /**
   * Checks if the response is ready to be sent.
   *
   * @returns True if response content has been configured
   */
  isReady(): boolean;

  /**
   * Checks if the response body is a stream.
   *
   * @returns True if the body is a ReadableStream
   */
  isStream(): boolean;

  /**
   * Builds the final Web API Response object.
   *
   * Typically called by the Kori framework automatically.
   * **Note**: This method can only be called once per response instance.
   *
   * @returns Web API Response object
   * @throws {KoriResponseBuildError} if called more than once
   */
  build(): Response;
};

/**
 * Type guard to check if a value is a KoriResponse.
 *
 * @param value - Value to check
 * @returns True if the value is a KoriResponse
 */
export function isKoriResponse(value: unknown): value is KoriResponse {
  return value !== null && typeof value === 'object' && 'koriKind' in value && value.koriKind === 'kori-response';
}

/** Internal state structure for response object */
type ResState = {
  koriKind: 'kori-response';

  statusCode: HttpStatusCode | null;
  headers: Map<string, string[]>;
  bodyKind: 'none' | 'json' | 'text' | 'html' | 'empty' | 'stream';
  bodyValue: unknown;
  built: boolean;
  req: KoriRequest;
  aborted: boolean;
};

function setHeaderInternal(res: ResState, name: HttpResponseHeaderName, value: string): void {
  const key = name.toLowerCase();
  if (key === HttpResponseHeader.SET_COOKIE) {
    throw new KoriSetCookieHeaderError();
  }
  res.headers.set(key, [value]);
}

function appendHeaderInternal(res: ResState, name: HttpResponseHeaderName, value: string): void {
  const key = name.toLowerCase();
  if (key === HttpResponseHeader.SET_COOKIE) {
    throw new KoriSetCookieHeaderError();
  }
  const existing = res.headers.get(key) ?? [];
  existing.push(value);
  res.headers.set(key, existing);
}

function appendSetCookieHeaderInternal(res: ResState, value: string): void {
  const existing = res.headers.get(HttpResponseHeader.SET_COOKIE) ?? [];
  existing.push(value);
  res.headers.set(HttpResponseHeader.SET_COOKIE, existing);
}

function removeHeaderInternal(res: ResState, name: HttpResponseHeaderName): void {
  const key = name.toLowerCase();
  res.headers.delete(key);
}

function setCookieInternal(res: ResState, name: string, value: string, options?: CookieOptions): void {
  const result = serializeCookie(name, value, options);
  if (!result.success) {
    throw new KoriCookieError(result.reason);
  }
  appendSetCookieHeaderInternal(res, result.value);
}

function clearCookieInternal(res: ResState, name: string, options?: Pick<CookieOptions, 'path' | 'domain'>): void {
  const result = deleteCookie(name, options);
  if (!result.success) {
    throw new KoriCookieError(result.reason);
  }
  appendSetCookieHeaderInternal(res, result.value);
}

/** Configuration for body setter functions */
type BodyConfig<T> = {
  res: ResState;
  body: T;
};

function setBodyJsonInternal<T>({ res, body }: BodyConfig<T>): void {
  res.bodyKind = 'json';
  res.bodyValue = body;
}

function setBodyTextInternal({ res, body }: BodyConfig<string>): void {
  res.bodyKind = 'text';
  res.bodyValue = body;
}

function setBodyHtmlInternal({ res, body }: BodyConfig<string>): void {
  res.bodyKind = 'html';
  res.bodyValue = body;
}

/** Configuration for empty body setter */
type EmptyBodyConfig = {
  res: ResState;
};

function setBodyEmptyInternal({ res }: EmptyBodyConfig): void {
  res.bodyKind = 'empty';
  res.bodyValue = undefined;
}

function setBodyStreamInternal({ res, body }: BodyConfig<ReadableStream>): void {
  res.bodyKind = 'stream';
  res.bodyValue = body;
}

/** Error type constants for error responses */
type ErrorType =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'TIMEOUT'
  | 'INTERNAL_SERVER_ERROR';

/** Structure of error response body */
type ErrorResponseBodyJson = {
  error: {
    type: ErrorType;
    message: string;
    [key: string]: unknown;
  };
};

function createErrorResponseBodyJson(options: {
  errorType: ErrorType;
  message: string;
  [key: string]: unknown;
}): ErrorResponseBodyJson {
  const { errorType, message, ...additionalFields } = options;

  return {
    error: {
      type: errorType,
      message,
      ...additionalFields,
    },
  };
}

/** Configuration for error response creation */
type ErrorConfig = {
  res: ResState;
  errorType: ErrorType;
  defaultMsg: string;
  status: HttpStatusCode;
  options?: ErrorResponseOptions;
};

function setErrorInternal({ res, errorType, defaultMsg, status, options = {} }: ErrorConfig): void {
  res.statusCode = status;
  const { message, ...additionalFields } = options;
  const finalMessage = message ?? defaultMsg;
  setBodyJsonInternal({
    res,
    body: createErrorResponseBodyJson({
      errorType,
      message: finalMessage,
      ...additionalFields,
    }),
  });
}

function getFinalStatusCode(res: ResState): HttpStatusCode {
  if (res.statusCode === null) {
    if (res.bodyKind === 'empty') {
      return HttpStatus.NO_CONTENT;
    } else {
      return HttpStatus.OK;
    }
  } else {
    return res.statusCode;
  }
}

/**
 * Pre-built header records for each response body type.
 *
 * Uses plain objects instead of Headers for better performance with new Response().
 * Used when no custom headers are set.
 */
const DefaultHeaders = {
  json: { [HttpResponseHeader.CONTENT_TYPE]: ContentType.APPLICATION_JSON_UTF8 },
  text: { [HttpResponseHeader.CONTENT_TYPE]: ContentType.TEXT_PLAIN_UTF8 },
  html: { [HttpResponseHeader.CONTENT_TYPE]: ContentType.TEXT_HTML_UTF8 },
  stream: { [HttpResponseHeader.CONTENT_TYPE]: ContentType.APPLICATION_OCTET_STREAM },
  empty: {},
  none: {},
} as const;

function getDefaultContentType(bodyKind: ResState['bodyKind']): string | null {
  switch (bodyKind) {
    case 'json':
      return ContentType.APPLICATION_JSON_UTF8;
    case 'text':
      return ContentType.TEXT_PLAIN_UTF8;
    case 'html':
      return ContentType.TEXT_HTML_UTF8;
    case 'stream':
      return ContentType.APPLICATION_OCTET_STREAM;
    default:
      return null;
  }
}

function getFinalHeaders(res: ResState): HeadersInit {
  if (res.headers.size === 0) {
    return DefaultHeaders[res.bodyKind];
  }

  const hasContentType = res.headers.has(HttpResponseHeader.CONTENT_TYPE);

  const headerArray: [string, string][] = [];
  for (const [name, values] of res.headers) {
    for (const value of values) {
      headerArray.push([name, value]);
    }
  }

  if (!hasContentType) {
    const defaultContentType = getDefaultContentType(res.bodyKind);
    if (defaultContentType) {
      headerArray.push([HttpResponseHeader.CONTENT_TYPE, defaultContentType]);
    }
  }

  return headerArray;
}

/**
 * Shared methods prototype for memory efficiency.
 *
 * All response instances share the same method implementations to reduce
 * memory usage. Methods are bound to individual ResState objects at runtime.
 */
const sharedMethods = {
  status(code: HttpStatusCode): KoriResponse {
    this.statusCode = code;
    return this as unknown as KoriResponse;
  },

  setHeader(name: HttpResponseHeaderName, value: string): KoriResponse {
    setHeaderInternal(this, name, value);
    return this as unknown as KoriResponse;
  },
  appendHeader(name: HttpResponseHeaderName, value: string): KoriResponse {
    appendHeaderInternal(this, name, value);
    return this as unknown as KoriResponse;
  },
  removeHeader(name: HttpResponseHeaderName): KoriResponse {
    removeHeaderInternal(this, name);
    return this as unknown as KoriResponse;
  },

  setCookie(name: string, value: string, options?: CookieOptions): KoriResponse {
    setCookieInternal(this, name, value, options);
    return this as unknown as KoriResponse;
  },
  clearCookie(name: string, options?: Pick<CookieOptions, 'path' | 'domain'>): KoriResponse {
    clearCookieInternal(this, name, options);
    return this as unknown as KoriResponse;
  },

  json<T>(body: T): KoriResponse {
    setBodyJsonInternal({ res: this, body });
    return this as unknown as KoriResponse;
  },
  text(body: string): KoriResponse {
    setBodyTextInternal({ res: this, body });
    return this as unknown as KoriResponse;
  },
  html(body: string): KoriResponse {
    setBodyHtmlInternal({ res: this, body });
    return this as unknown as KoriResponse;
  },
  empty(): KoriResponse {
    setBodyEmptyInternal({ res: this });
    return this as unknown as KoriResponse;
  },
  stream(body: ReadableStream): KoriResponse {
    setBodyStreamInternal({ res: this, body });
    return this as unknown as KoriResponse;
  },

  badRequest(options: ErrorResponseOptions = {}): KoriResponse {
    setErrorInternal({
      res: this,
      errorType: 'BAD_REQUEST',
      defaultMsg: 'Bad Request',
      status: HttpStatus.BAD_REQUEST,
      options,
    });
    return this as unknown as KoriResponse;
  },
  unauthorized(options: ErrorResponseOptions = {}): KoriResponse {
    setErrorInternal({
      res: this,
      errorType: 'UNAUTHORIZED',
      defaultMsg: 'Unauthorized',
      status: HttpStatus.UNAUTHORIZED,
      options,
    });
    return this as unknown as KoriResponse;
  },
  forbidden(options: ErrorResponseOptions = {}): KoriResponse {
    setErrorInternal({
      res: this,
      errorType: 'FORBIDDEN',
      defaultMsg: 'Forbidden',
      status: HttpStatus.FORBIDDEN,
      options,
    });
    return this as unknown as KoriResponse;
  },
  notFound(options: ErrorResponseOptions = {}): KoriResponse {
    setErrorInternal({
      res: this,
      errorType: 'NOT_FOUND',
      defaultMsg: 'Not Found',
      status: HttpStatus.NOT_FOUND,
      options,
    });
    return this as unknown as KoriResponse;
  },
  methodNotAllowed(options: ErrorResponseOptions = {}): KoriResponse {
    setErrorInternal({
      res: this,
      errorType: 'METHOD_NOT_ALLOWED',
      defaultMsg: 'Method Not Allowed',
      status: HttpStatus.METHOD_NOT_ALLOWED,
      options,
    });
    return this as unknown as KoriResponse;
  },
  unsupportedMediaType(options: ErrorResponseOptions = {}): KoriResponse {
    setErrorInternal({
      res: this,
      errorType: 'UNSUPPORTED_MEDIA_TYPE',
      defaultMsg: 'Unsupported Media Type',
      status: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      options,
    });
    return this as unknown as KoriResponse;
  },
  timeout(options: ErrorResponseOptions = {}): KoriResponse {
    setErrorInternal({
      res: this,
      errorType: 'TIMEOUT',
      defaultMsg: 'Request Timeout',
      status: HttpStatus.REQUEST_TIMEOUT,
      options,
    });
    return this as unknown as KoriResponse;
  },
  internalError(options: ErrorResponseOptions = {}): KoriResponse {
    setErrorInternal({
      res: this,
      errorType: 'INTERNAL_SERVER_ERROR',
      defaultMsg: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      options,
    });
    return this as unknown as KoriResponse;
  },

  build(): Response {
    if (this.built) {
      throw new KoriResponseBuildError('Response can only be built once.');
    }
    this.built = true;

    let body: BodyInit | null = null;
    switch (this.bodyKind) {
      case 'json':
        try {
          body = JSON.stringify(this.bodyValue);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new KoriResponseBuildError(`Failed to serialize response body as JSON: ${message}`);
        }
        break;
      case 'text':
      case 'html':
        body = this.bodyValue as string;
        break;
      case 'stream':
        body = this.bodyValue as ReadableStream;
        break;
      default:
        body = null;
    }

    return new Response(body, {
      status: getFinalStatusCode(this),
      headers: getFinalHeaders(this),
    });
  },

  getStatus(): HttpStatusCode {
    return getFinalStatusCode(this);
  },
  getHeadersCopy(): Headers {
    return new Headers(getFinalHeaders(this));
  },
  getHeader(name: HttpResponseHeaderName): string | undefined {
    const key = name.toLowerCase();
    const values = this.headers.get(key);
    if (values && values.length > 0) {
      return values.join(', ');
    }
    if (key === HttpResponseHeader.CONTENT_TYPE && this.headers.size === 0) {
      const defaults = DefaultHeaders[this.bodyKind];
      if (defaults && HttpResponseHeader.CONTENT_TYPE in defaults) {
        return defaults[HttpResponseHeader.CONTENT_TYPE];
      }
    }
    if (key === HttpResponseHeader.CONTENT_TYPE && !this.headers.has(HttpResponseHeader.CONTENT_TYPE)) {
      return getDefaultContentType(this.bodyKind) ?? undefined;
    }
    return undefined;
  },
  getContentType(this: ResState): string | undefined {
    const key = HttpResponseHeader.CONTENT_TYPE;
    const values = this.headers.get(key);
    if (values && values.length > 0) {
      return values.join(', ');
    }
    if (this.headers.size === 0) {
      const defaults = DefaultHeaders[this.bodyKind];
      if (defaults && HttpResponseHeader.CONTENT_TYPE in defaults) {
        return defaults[HttpResponseHeader.CONTENT_TYPE];
      }
    }
    if (!this.headers.has(HttpResponseHeader.CONTENT_TYPE)) {
      return getDefaultContentType(this.bodyKind) ?? undefined;
    }
    return undefined;
  },
  getMediaType(this: ResState): string | undefined {
    const key = HttpResponseHeader.CONTENT_TYPE;
    const values = this.headers.get(key);
    let contentType: string | undefined;
    if (values && values.length > 0) {
      contentType = values.join(', ');
    } else if (this.headers.size === 0) {
      const defaults = DefaultHeaders[this.bodyKind];
      if (defaults && HttpResponseHeader.CONTENT_TYPE in defaults) {
        contentType = defaults[HttpResponseHeader.CONTENT_TYPE];
      }
    } else if (!this.headers.has(HttpResponseHeader.CONTENT_TYPE)) {
      contentType = getDefaultContentType(this.bodyKind) ?? undefined;
    }
    return contentType?.split(';')[0]?.trim();
  },
  getBody(): unknown {
    return this.bodyValue;
  },
  isReady(): boolean {
    return this.bodyKind !== 'none';
  },
  isStream(): boolean {
    return this.bodyKind === 'stream';
  },
} satisfies Omit<KoriResponse, 'koriKind'> & ThisType<ResState>;

/**
 * Creates a new Kori response object.
 *
 * @packageInternal Framework infrastructure for creating response objects
 *
 * @param req - Associated request object for context
 * @returns New KoriResponse instance
 */
export function createKoriResponse(req: KoriRequest): KoriResponse {
  const obj = Object.create(sharedMethods) as ResState;

  obj.koriKind = 'kori-response';
  obj.statusCode = null;
  obj.headers = new Map();
  obj.bodyKind = 'none';
  obj.bodyValue = undefined;
  obj.built = false;
  obj.req = req;
  obj.aborted = false;

  return obj as unknown as KoriResponse;
}
