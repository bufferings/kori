import { HttpStatus, type HttpStatusCode } from '../http/index.js';

const KoriResponseBrand = Symbol('kori-response');

type InitialBody = { type: 'initial'; value: null };
type JsonBody<T = unknown> = { type: 'json'; value: T };
type TextBody = { type: 'text'; value: string };
type HtmlBody = { type: 'html'; value: string };
type EmptyBody = { type: 'empty'; value: null };
type StreamBody = { type: 'stream'; value: ReadableStream };

type ResponseBody = InitialBody | JsonBody | TextBody | HtmlBody | EmptyBody | StreamBody;

type InternalResponseState = {
  status: HttpStatusCode;
  headers: Headers;
  body: ResponseBody;
};

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

  setHeader(name: string, value: string): KoriResponse;
  appendHeader(name: string, value: string): KoriResponse;
  removeHeader(name: string): KoriResponse;

  json<T>(body: T): KoriResponse;
  text(body: string): KoriResponse;
  html(body: string): KoriResponse;
  empty(statusCode?: HttpStatusCode): KoriResponse;
  stream(body: ReadableStream): KoriResponse;

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

  build(): Response;
};

export function isKoriResponse(value: unknown): value is KoriResponse {
  return typeof value === 'object' && value !== null && KoriResponseBrand in value;
}

const ensureContentType = (headers: Headers, contentType: string): Headers => {
  if (!headers.has('content-type')) {
    headers.set('content-type', `${contentType};charset=utf-8`);
  }
  return headers;
};

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
  const internalState: InternalResponseState = {
    status: HttpStatus.OK,
    headers: new Headers(),
    body: { type: 'initial', value: null },
  };

  const self: KoriResponse = {
    [KoriResponseBrand]: KoriResponseBrand,

    status: function (statusCode: HttpStatusCode) {
      internalState.status = statusCode;
      return self;
    },

    setHeader: function (name: string, value: string) {
      internalState.headers.set(name, value);
      return self;
    },

    appendHeader: function (name: string, value: string) {
      internalState.headers.append(name, value);
      return self;
    },

    removeHeader: function (name: string) {
      internalState.headers.delete(name);
      return self;
    },

    json: function <T>(body: T) {
      internalState.body = { type: 'json', value: body };
      return self;
    },

    text: function (body: string) {
      internalState.body = { type: 'text', value: body };
      return self;
    },

    html: function (body: string) {
      internalState.body = { type: 'html', value: body };
      return self;
    },

    empty: function (statusCode: HttpStatusCode = HttpStatus.NO_CONTENT) {
      internalState.body = { type: 'empty', value: null };
      internalState.status = statusCode;
      return self;
    },

    stream: function (body: ReadableStream) {
      internalState.body = { type: 'stream', value: body };
      return self;
    },

    badRequest: function (options: ErrorResponseOptions) {
      internalState.status = HttpStatus.BAD_REQUEST;
      const message = options.message ?? 'Bad Request';
      if (options.type === 'text') {
        internalState.body = {
          type: 'text',
          value: message,
        };
      } else {
        internalState.body = {
          type: 'json',
          value: createErrorResponseBodyJson({
            errorType: 'BAD_REQUEST',
            message,
            details: options.details,
          }),
        };
      }
      return self;
    },

    unauthorized: function (options: ErrorResponseOptions = {}) {
      internalState.status = HttpStatus.UNAUTHORIZED;
      const message = options.message ?? 'Unauthorized';
      if (options.type === 'text') {
        internalState.body = {
          type: 'text',
          value: message,
        };
      } else {
        internalState.body = {
          type: 'json',
          value: createErrorResponseBodyJson({
            errorType: 'UNAUTHORIZED',
            message,
            details: options.details,
          }),
        };
      }
      return self;
    },

    forbidden: function (options: ErrorResponseOptions = {}) {
      internalState.status = HttpStatus.FORBIDDEN;
      const message = options.message ?? 'Forbidden';
      if (options.type === 'text') {
        internalState.body = {
          type: 'text',
          value: message,
        };
      } else {
        internalState.body = {
          type: 'json',
          value: createErrorResponseBodyJson({
            errorType: 'FORBIDDEN',
            message,
            details: options.details,
          }),
        };
      }
      return self;
    },

    notFound: function (options: ErrorResponseOptions = {}) {
      internalState.status = HttpStatus.NOT_FOUND;
      const message = options.message ?? 'Not Found';
      if (options.type === 'text') {
        internalState.body = {
          type: 'text',
          value: message,
        };
      } else {
        internalState.body = {
          type: 'json',
          value: createErrorResponseBodyJson({
            errorType: 'NOT_FOUND',
            message,
            details: options.details,
          }),
        };
      }
      return self;
    },

    methodNotAllowed: function (options: ErrorResponseOptions = {}) {
      internalState.status = HttpStatus.METHOD_NOT_ALLOWED;
      const message = options.message ?? 'Method Not Allowed';
      if (options.type === 'text') {
        internalState.body = {
          type: 'text',
          value: message,
        };
      } else {
        internalState.body = {
          type: 'json',
          value: createErrorResponseBodyJson({
            errorType: 'METHOD_NOT_ALLOWED',
            message,
            details: options.details,
          }),
        };
      }
      return self;
    },

    unsupportedMediaType: function (options: ErrorResponseOptions = {}) {
      internalState.status = HttpStatus.UNSUPPORTED_MEDIA_TYPE;
      const message = options.message ?? 'Unsupported Media Type';
      if (options.type === 'text') {
        internalState.body = {
          type: 'text',
          value: message,
        };
      } else {
        internalState.body = {
          type: 'json',
          value: createErrorResponseBodyJson({
            errorType: 'UNSUPPORTED_MEDIA_TYPE',
            message,
            details: options.details,
          }),
        };
      }
      return self;
    },

    timeout: function (options: ErrorResponseOptions = {}) {
      internalState.status = HttpStatus.REQUEST_TIMEOUT;
      const message = options.message ?? 'Request Timeout';
      if (options.type === 'text') {
        internalState.body = {
          type: 'text',
          value: message,
        };
      } else {
        internalState.body = {
          type: 'json',
          value: createErrorResponseBodyJson({
            errorType: 'TIMEOUT',
            message,
            details: options.details,
          }),
        };
      }
      return self;
    },

    internalError: function (options: ErrorResponseOptions = {}) {
      internalState.status = HttpStatus.INTERNAL_SERVER_ERROR;
      const message = options.message ?? 'Internal Server Error';
      if (options.type === 'text') {
        internalState.body = {
          type: 'text',
          value: message,
        };
      } else {
        internalState.body = {
          type: 'json',
          value: createErrorResponseBodyJson({
            errorType: 'INTERNAL_SERVER_ERROR',
            message,
            details: options.details,
          }),
        };
      }
      return self;
    },

    getStatus: function () {
      return internalState.status;
    },

    getHeaders: function (): Headers {
      return new Headers(internalState.headers);
    },

    getBody: function (): unknown {
      return internalState.body.value;
    },

    getContentType: function (): string | undefined {
      return internalState.headers.get('content-type') ?? undefined;
    },

    isSet: function (): boolean {
      return internalState.body.type !== 'initial';
    },

    build: function (): Response {
      const responseHeaders = new Headers(internalState.headers);
      const responseInit: ResponseInit = {
        status: internalState.status,
        headers: responseHeaders,
      };

      switch (internalState.body.type) {
        case 'initial':
          return new Response(null, responseInit);
        case 'json':
          return Response.json(internalState.body.value, responseInit);
        case 'text':
          ensureContentType(responseHeaders, 'text/plain');
          return new Response(internalState.body.value, responseInit);
        case 'html':
          ensureContentType(responseHeaders, 'text/html');
          return new Response(internalState.body.value, responseInit);
        case 'empty':
          return new Response(null, responseInit);
        case 'stream':
          ensureContentType(responseHeaders, 'application/octet-stream');
          return new Response(internalState.body.value, responseInit);
        default: {
          // This part should be unreachable if ResponseBody is a complete discriminated union
          // and all cases are handled. The `never` type assertion helps ensure exhaustiveness.
          const _exhaustiveCheck: never = internalState.body;
          throw new Error(`Unknown body type: ${(_exhaustiveCheck as ResponseBody).type}`);
        }
      }
    },
  };

  return self;
}
