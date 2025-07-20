import {
  HttpStatus,
  type HttpStatusCode,
  type HttpResponseHeaderValue,
  HttpResponseHeader,
  ContentTypeUtf8,
  ContentType,
} from '../http/index.js';

const KoriResponseBrand = Symbol('kori-response');

const DefaultJsonHeaders = new Headers({
  [HttpResponseHeader.CONTENT_TYPE]: ContentTypeUtf8.APPLICATION_JSON,
});

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
  getHeader(key: HttpResponseHeaderValue): string | undefined;
  getBody(): unknown;
  getContentType(): string | undefined;
  isReady(): boolean;
  isStream(): boolean;

  build(): Response;
};

type ResState = {
  [KoriResponseBrand]: typeof KoriResponseBrand;

  statusCode: HttpStatusCode;
  headers: Headers | undefined;
  bodyKind: 'none' | 'json' | 'text' | 'html' | 'empty' | 'stream';
  bodyValue: unknown;
  headersShared: boolean;
};

export function isKoriResponse(value: unknown): value is KoriResponse {
  return typeof value === 'object' && value !== null && KoriResponseBrand in value;
}

function ensureHeaders(res: ResState): void {
  if (res.headersShared) {
    res.headers = new Headers(res.headers);
    res.headersShared = false;
  }
  res.headers ??= new Headers();
}

function setHeaderInternal(res: ResState, key: HttpResponseHeaderValue, value: string): void {
  ensureHeaders(res);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  res.headers!.set(key, value);
}

function appendHeaderInternal(res: ResState, key: HttpResponseHeaderValue, value: string): void {
  ensureHeaders(res);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  res.headers!.append(key, value);
}

function removeHeaderInternal(res: ResState, key: HttpResponseHeaderValue): void {
  if (!res.headers) {
    return;
  }
  ensureHeaders(res);
  res.headers.delete(key);
}

function setStatusInternal(res: ResState, code: HttpStatusCode): void {
  res.statusCode = code;
}

type BodyConfig<T> = {
  res: ResState;
  body: T;
  code?: HttpStatusCode;
};

function setBodyJsonInternal<T>({ res, body, code }: BodyConfig<T>): void {
  res.bodyKind = 'json';
  res.bodyValue = JSON.stringify(body);
  if (code) {
    res.statusCode = code;
  }
  if (!res.headers) {
    res.headers = DefaultJsonHeaders;
    res.headersShared = true;
  } else {
    setHeaderInternal(res, HttpResponseHeader.CONTENT_TYPE, ContentTypeUtf8.APPLICATION_JSON);
  }
}

function setBodyTextInternal({ res, body, code }: BodyConfig<string>): void {
  res.bodyKind = 'text';
  res.bodyValue = body;
  if (code) {
    res.statusCode = code;
  }
  setHeaderInternal(res, HttpResponseHeader.CONTENT_TYPE, ContentTypeUtf8.TEXT_PLAIN);
}

function setBodyHtmlInternal({ res, body, code }: BodyConfig<string>): void {
  res.bodyKind = 'html';
  res.bodyValue = body;
  if (code) {
    res.statusCode = code;
  }
  setHeaderInternal(res, HttpResponseHeader.CONTENT_TYPE, ContentTypeUtf8.TEXT_HTML);
}

type EmptyBodyConfig = {
  res: ResState;
  code?: HttpStatusCode;
};

function setBodyEmptyInternal({ res, code = HttpStatus.NO_CONTENT }: EmptyBodyConfig): void {
  res.bodyKind = 'empty';
  res.bodyValue = undefined;
  res.statusCode = code;
}

function setBodyStreamInternal({ res, body, code }: BodyConfig<ReadableStream>): void {
  res.bodyKind = 'stream';
  res.bodyValue = body;
  if (code) {
    res.statusCode = code;
  }
  setHeaderInternal(res, HttpResponseHeader.CONTENT_TYPE, ContentType.APPLICATION_OCTET_STREAM);
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

type ErrorResponseBodyJson = {
  error: {
    type: ErrorType;
    message: string;
    details?: unknown;
  };
};

function createErrorResponseBodyJson(options: {
  errorType: ErrorType;
  message: string;
  details?: unknown;
}): ErrorResponseBodyJson {
  return {
    error: {
      type: options.errorType,
      message: options.message,
      details: options.details,
    },
  };
}

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

type ErrorConfig = {
  res: ResState;
  errorType: ErrorType;
  defaultMsg: string;
  status: HttpStatusCode;
  options?: ErrorResponseOptions;
};

function setErrorInternal({ res, errorType, defaultMsg, status, options = {} }: ErrorConfig): void {
  const msg = options.message ?? defaultMsg;
  if (options.type === 'text') {
    setBodyTextInternal({ res, body: msg, code: status });
  } else {
    setBodyJsonInternal({
      res,
      body: createErrorResponseBodyJson({ errorType, message: msg, details: options.details }),
      code: status,
    });
  }
}

const sharedMethods = {
  status(code: HttpStatusCode): KoriResponse {
    setStatusInternal(this, code);
    return this as unknown as KoriResponse;
  },

  setHeader(key: HttpResponseHeaderValue, value: string): KoriResponse {
    setHeaderInternal(this, key, value);
    return this as unknown as KoriResponse;
  },
  appendHeader(key: HttpResponseHeaderValue, value: string): KoriResponse {
    appendHeaderInternal(this, key, value);
    return this as unknown as KoriResponse;
  },
  removeHeader(key: HttpResponseHeaderValue): KoriResponse {
    removeHeaderInternal(this, key);
    return this as unknown as KoriResponse;
  },

  json<T>(body: T, code?: HttpStatusCode): KoriResponse {
    setBodyJsonInternal({ res: this, body, code });
    return this as unknown as KoriResponse;
  },
  text(body: string, code?: HttpStatusCode): KoriResponse {
    setBodyTextInternal({ res: this, body, code });
    return this as unknown as KoriResponse;
  },
  html(body: string, code?: HttpStatusCode): KoriResponse {
    setBodyHtmlInternal({ res: this, body, code });
    return this as unknown as KoriResponse;
  },
  empty(code: HttpStatusCode = HttpStatus.NO_CONTENT): KoriResponse {
    setBodyEmptyInternal({ res: this, code });
    return this as unknown as KoriResponse;
  },
  stream(body: ReadableStream, code?: HttpStatusCode): KoriResponse {
    setBodyStreamInternal({ res: this, body, code });
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
    let body: BodyInit | null = null;
    switch (this.bodyKind) {
      case 'json':
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
      status: this.statusCode,
      headers: this.headers,
    });
  },

  getStatus(): HttpStatusCode {
    return this.statusCode;
  },
  getHeaders(): Headers {
    return new Headers(this.headers);
  },
  getHeader(key: HttpResponseHeaderValue): string | undefined {
    return this.headers?.get(key) ?? undefined;
  },
  getBody(): unknown {
    return this.bodyValue;
  },
  getContentType(): string | undefined {
    return this.headers?.get(HttpResponseHeader.CONTENT_TYPE) ?? undefined;
  },
  isReady(): boolean {
    return this.bodyKind !== 'none';
  },
  isStream(): boolean {
    return this.bodyKind === 'stream';
  },
} satisfies Omit<KoriResponse, typeof KoriResponseBrand> & ThisType<ResState>;

export function createKoriResponse(): KoriResponse {
  const obj = Object.create(sharedMethods) as ResState;

  obj[KoriResponseBrand] = KoriResponseBrand;
  obj.statusCode = HttpStatus.OK;
  obj.headers = undefined;
  obj.headersShared = false;
  obj.bodyKind = 'none';
  obj.bodyValue = undefined;

  return obj as unknown as KoriResponse;
}
