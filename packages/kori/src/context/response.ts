import { HttpStatus, type HttpStatusCode, type HttpResponseHeaderValue } from '../http/index.js';

const KoriResponseBrand = Symbol('kori-response');

type ErrorResponseOptions =
  | {
      type: 'json';
      message?: string;
      details?: unknown;
    }
  | {
      type: 'text';
      message?: string;
    }
  | {
      // Default (treated as JSON)
      type?: undefined;
      message?: string;
      details?: unknown;
    };

export type KoriResponse = {
  [KoriResponseBrand]: typeof KoriResponseBrand;

  status(statusCode: HttpStatusCode): KoriResponse;

  setHeader(key: HttpResponseHeaderValue, value: string): KoriResponse;
  appendHeader(key: HttpResponseHeaderValue, value: string): KoriResponse;
  removeHeader(key: HttpResponseHeaderValue): KoriResponse;

  json<T>(body: T, statusCode?: HttpStatusCode): KoriResponse;
  text(body: string, statusCode?: HttpStatusCode): KoriResponse;
  html(body: string, statusCode?: HttpStatusCode): KoriResponse;
  empty(statusCode?: HttpStatusCode): KoriResponse;
  stream(body: ReadableStream, statusCode?: HttpStatusCode): KoriResponse;

  // Error response helpers
  badRequest(options?: ErrorResponseOptions): KoriResponse;
  unauthorized(options?: ErrorResponseOptions): KoriResponse;
  forbidden(options?: ErrorResponseOptions): KoriResponse;
  notFound(options?: ErrorResponseOptions): KoriResponse;
  methodNotAllowed(options?: ErrorResponseOptions): KoriResponse;
  unsupportedMediaType(options?: ErrorResponseOptions): KoriResponse;
  timeout(options?: ErrorResponseOptions): KoriResponse;
  internalError(options?: ErrorResponseOptions): KoriResponse;

  getStatus(): HttpStatusCode;
  getHeaders(): Headers;
  getBody(): unknown;
  getContentType(): string | undefined;
  isSet(): boolean;
  isStream(): boolean;

  build(): Response;
};

export function isKoriResponse(value: unknown): value is KoriResponse {
  return typeof value === 'object' && value !== null && KoriResponseBrand in value;
}

type ErrorType =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'TIMEOUT'
  | 'INTERNAL_SERVER_ERROR';

const createErrorResponseBodyJson = (options: { errorType: ErrorType; message: string; details?: unknown }) => {
  return {
    error: { type: options.errorType, message: options.message, details: options.details },
  };
};

export function createKoriResponse(): KoriResponse {
  let response: Response | null = null;
  let currentStatus: HttpStatusCode = HttpStatus.OK;
  let bodyValue: unknown = null;
  let isStreamBody = false;

  const self: KoriResponse = {
    [KoriResponseBrand]: KoriResponseBrand,

    status: function (statusCode: HttpStatusCode) {
      currentStatus = statusCode;
      if (response) {
        // Response is immutable, so we need to recreate it with new status
        const newResponse = new Response(response.body, {
          status: statusCode,
          headers: response.headers,
        });
        response = newResponse;
      }
      return self;
    },

    setHeader: function (key: HttpResponseHeaderValue, value: string) {
      if (response) {
        response.headers.set(key, value);
      }
      return self;
    },

    appendHeader: function (key: HttpResponseHeaderValue, value: string) {
      if (response) {
        response.headers.append(key, value);
      }
      return self;
    },

    removeHeader: function (key: HttpResponseHeaderValue) {
      if (response) {
        response.headers.delete(key);
      }
      return self;
    },

    json: function <T>(body: T, statusCode?: HttpStatusCode) {
      bodyValue = body;
      isStreamBody = false;
      response = new Response(JSON.stringify(body), {
        status: statusCode ?? currentStatus,
        headers: {
          'content-type': 'application/json;charset=utf-8',
        },
      });
      return self;
    },

    text: function (body: string, statusCode?: HttpStatusCode) {
      bodyValue = body;
      isStreamBody = false;
      response = new Response(body, {
        status: statusCode ?? currentStatus,
        headers: {
          'content-type': 'text/plain;charset=utf-8',
        },
      });
      return self;
    },

    html: function (body: string, statusCode?: HttpStatusCode) {
      bodyValue = body;
      isStreamBody = false;
      response = new Response(body, {
        status: statusCode ?? currentStatus,
        headers: {
          'content-type': 'text/html;charset=utf-8',
        },
      });
      return self;
    },

    empty: function (statusCode: HttpStatusCode = HttpStatus.NO_CONTENT) {
      bodyValue = null;
      isStreamBody = false;
      response = new Response(null, {
        status: statusCode,
      });
      return self;
    },

    stream: function (body: ReadableStream, statusCode?: HttpStatusCode) {
      bodyValue = body;
      isStreamBody = true;
      response = new Response(body, {
        status: statusCode ?? currentStatus,
        headers: {
          'content-type': 'application/octet-stream',
        },
      });
      return self;
    },

    badRequest: function (options: ErrorResponseOptions = {}) {
      const message = options.message ?? 'Bad Request';
      if (options.type === 'text') {
        return self.text(message, HttpStatus.BAD_REQUEST);
      } else {
        const body = createErrorResponseBodyJson({
          errorType: 'BAD_REQUEST',
          message,
          details: options.details,
        });
        return self.json(body, HttpStatus.BAD_REQUEST);
      }
    },

    unauthorized: function (options: ErrorResponseOptions = {}) {
      const message = options.message ?? 'Unauthorized';
      if (options.type === 'text') {
        return self.text(message, HttpStatus.UNAUTHORIZED);
      } else {
        const body = createErrorResponseBodyJson({
          errorType: 'UNAUTHORIZED',
          message,
          details: options.details,
        });
        return self.json(body, HttpStatus.UNAUTHORIZED);
      }
    },

    forbidden: function (options: ErrorResponseOptions = {}) {
      const message = options.message ?? 'Forbidden';
      if (options.type === 'text') {
        return self.text(message, HttpStatus.FORBIDDEN);
      } else {
        const body = createErrorResponseBodyJson({
          errorType: 'FORBIDDEN',
          message,
          details: options.details,
        });
        return self.json(body, HttpStatus.FORBIDDEN);
      }
    },

    notFound: function (options: ErrorResponseOptions = {}) {
      const message = options.message ?? 'Not Found';
      if (options.type === 'text') {
        return self.text(message, HttpStatus.NOT_FOUND);
      } else {
        const body = createErrorResponseBodyJson({
          errorType: 'NOT_FOUND',
          message,
          details: options.details,
        });
        return self.json(body, HttpStatus.NOT_FOUND);
      }
    },

    methodNotAllowed: function (options: ErrorResponseOptions = {}) {
      const message = options.message ?? 'Method Not Allowed';
      if (options.type === 'text') {
        return self.text(message, HttpStatus.METHOD_NOT_ALLOWED);
      } else {
        const body = createErrorResponseBodyJson({
          errorType: 'METHOD_NOT_ALLOWED',
          message,
          details: options.details,
        });
        return self.json(body, HttpStatus.METHOD_NOT_ALLOWED);
      }
    },

    unsupportedMediaType: function (options: ErrorResponseOptions = {}) {
      const message = options.message ?? 'Unsupported Media Type';
      if (options.type === 'text') {
        return self.text(message, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      } else {
        const body = createErrorResponseBodyJson({
          errorType: 'UNSUPPORTED_MEDIA_TYPE',
          message,
          details: options.details,
        });
        return self.json(body, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      }
    },

    timeout: function (options: ErrorResponseOptions = {}) {
      const message = options.message ?? 'Request Timeout';
      if (options.type === 'text') {
        return self.text(message, HttpStatus.REQUEST_TIMEOUT);
      } else {
        const body = createErrorResponseBodyJson({
          errorType: 'TIMEOUT',
          message,
          details: options.details,
        });
        return self.json(body, HttpStatus.REQUEST_TIMEOUT);
      }
    },

    internalError: function (options: ErrorResponseOptions = {}) {
      const message = options.message ?? 'Internal Server Error';
      if (options.type === 'text') {
        return self.text(message, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const body = createErrorResponseBodyJson({
          errorType: 'INTERNAL_SERVER_ERROR',
          message,
          details: options.details,
        });
        return self.json(body, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    },

    getStatus: function () {
      return response?.status ?? currentStatus;
    },

    getHeaders: function (): Headers {
      return response ? new Headers(response.headers) : new Headers();
    },

    getBody: function (): unknown {
      return bodyValue;
    },

    getContentType: function (): string | undefined {
      return response?.headers.get('content-type') ?? undefined;
    },

    isSet: function (): boolean {
      return response !== null;
    },

    isStream: function (): boolean {
      return isStreamBody;
    },

    build: function (): Response {
      if (!response) {
        // If no response has been set, return an empty response
        return new Response(null, { status: currentStatus });
      }
      return response;
    },
  };

  return self;
}
