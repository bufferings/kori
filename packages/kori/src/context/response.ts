import {
  HttpStatus,
  type HttpStatusCode,
  type HttpResponseHeaderName,
  HttpResponseHeader,
  ContentType,
  ContentTypeUtf8,
  type CookieOptions,
  type CookieValue,
  serializeCookie,
  deleteCookie,
} from '../http/index.js';

const KoriResponseBrand = Symbol('kori-response');

const DefaultHeaders = {
  json: new Headers({
    [HttpResponseHeader.CONTENT_TYPE]: ContentTypeUtf8.APPLICATION_JSON,
  }),
  text: new Headers({
    [HttpResponseHeader.CONTENT_TYPE]: ContentTypeUtf8.TEXT_PLAIN,
  }),
  html: new Headers({
    [HttpResponseHeader.CONTENT_TYPE]: ContentTypeUtf8.TEXT_HTML,
  }),
  stream: new Headers({
    [HttpResponseHeader.CONTENT_TYPE]: ContentType.APPLICATION_OCTET_STREAM,
  }),
  empty: new Headers(), // No Content-Type for empty responses
  none: new Headers(), // No Content-Type for uninitialized responses
} as const;

export type KoriResponse = {
  [KoriResponseBrand]: typeof KoriResponseBrand;

  status(statusCode: HttpStatusCode): KoriResponse;

  setHeader(name: HttpResponseHeaderName, value: string): KoriResponse;
  appendHeader(name: HttpResponseHeaderName, value: string): KoriResponse;
  removeHeader(name: HttpResponseHeaderName): KoriResponse;

  setCookie(name: string, value: CookieValue, options?: CookieOptions): KoriResponse;
  clearCookie(name: string, options?: Pick<CookieOptions, 'path' | 'domain'>): KoriResponse;

  json<T>(body: T): KoriResponse;
  text(body: string): KoriResponse;
  html(body: string): KoriResponse;
  empty(): KoriResponse;
  stream(body: ReadableStream): KoriResponse;

  badRequest(options?: ErrorResponseOptions): KoriResponse;
  unauthorized(options?: ErrorResponseOptions): KoriResponse;
  forbidden(options?: ErrorResponseOptions): KoriResponse;
  notFound(options?: ErrorResponseOptions): KoriResponse;
  methodNotAllowed(options?: ErrorResponseOptions): KoriResponse;
  unsupportedMediaType(options?: ErrorResponseOptions): KoriResponse;
  timeout(options?: ErrorResponseOptions): KoriResponse;
  internalError(options?: ErrorResponseOptions): KoriResponse;

  getStatus(): HttpStatusCode;
  getHeadersCopy(): Headers;
  getHeader(name: HttpResponseHeaderName): string | undefined;
  getContentType(): string | undefined;
  getBody(): unknown;
  isReady(): boolean;
  isStream(): boolean;

  build(): Response;
};

type ResState = {
  [KoriResponseBrand]: typeof KoriResponseBrand;

  statusCode: HttpStatusCode | null;
  headers: Headers | undefined;
  bodyKind: 'none' | 'json' | 'text' | 'html' | 'empty' | 'stream';
  bodyValue: unknown;
  built: boolean;
};

export function isKoriResponse(value: unknown): value is KoriResponse {
  return typeof value === 'object' && value !== null && KoriResponseBrand in value;
}

function setHeaderInternal(res: ResState, name: HttpResponseHeaderName, value: string): void {
  res.headers ??= new Headers();
  res.headers.set(name, value);
}

function appendHeaderInternal(res: ResState, name: HttpResponseHeaderName, value: string): void {
  res.headers ??= new Headers();
  res.headers.append(name, value);
}

function removeHeaderInternal(res: ResState, name: HttpResponseHeaderName): void {
  if (!res.headers) {
    return;
  }
  res.headers.delete(name);
}

function setCookieInternal(res: ResState, name: string, value: CookieValue, options?: CookieOptions): void {
  const cookieValue = serializeCookie(name, value, options);
  appendHeaderInternal(res, HttpResponseHeader.SET_COOKIE, cookieValue);
}

function clearCookieInternal(res: ResState, name: string, options?: Pick<CookieOptions, 'path' | 'domain'>): void {
  const cookieValue = deleteCookie(name, options);
  appendHeaderInternal(res, HttpResponseHeader.SET_COOKIE, cookieValue);
}

type BodyConfig<T> = {
  res: ResState;
  body: T;
};

function setBodyJsonInternal<T>({ res, body }: BodyConfig<T>): void {
  res.bodyKind = 'json';
  res.bodyValue = JSON.stringify(body);
}

function setBodyTextInternal({ res, body }: BodyConfig<string>): void {
  res.bodyKind = 'text';
  res.bodyValue = body;
}

function setBodyHtmlInternal({ res, body }: BodyConfig<string>): void {
  res.bodyKind = 'html';
  res.bodyValue = body;
}

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
  };
};

function createErrorResponseBodyJson(options: { errorType: ErrorType; message: string }): ErrorResponseBodyJson {
  return {
    error: {
      type: options.errorType,
      message: options.message,
    },
  };
}

type ErrorResponseOptions = {
  type?: 'json' | 'text';
  message?: string;
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
  res.statusCode = status;
  if (options.type === 'text') {
    setBodyTextInternal({ res, body: msg });
  } else {
    setBodyJsonInternal({
      res,
      body: createErrorResponseBodyJson({ errorType, message: msg }),
    });
  }
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

function getFinalHeaders(res: ResState): Headers {
  if (!res.headers) {
    const defaultHeaders = DefaultHeaders[res.bodyKind];
    return defaultHeaders ?? new Headers();
  } else if (!res.headers.has(HttpResponseHeader.CONTENT_TYPE)) {
    const finalHeaders = new Headers(res.headers);
    const getDefaultContentType = (): string | null => {
      switch (res.bodyKind) {
        case 'json':
          return ContentTypeUtf8.APPLICATION_JSON;
        case 'text':
          return ContentTypeUtf8.TEXT_PLAIN;
        case 'html':
          return ContentTypeUtf8.TEXT_HTML;
        case 'stream':
          return ContentType.APPLICATION_OCTET_STREAM;
        default:
          return null;
      }
    };
    const defaultContentType = getDefaultContentType();
    if (defaultContentType) {
      finalHeaders.set(HttpResponseHeader.CONTENT_TYPE, defaultContentType);
    }
    return finalHeaders;
  } else {
    return res.headers;
  }
}

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

  setCookie(name: string, value: CookieValue, options?: CookieOptions): KoriResponse {
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
      throw new Error('Response can only be built once.');
    }
    this.built = true;

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
    return getFinalHeaders(this).get(name) ?? undefined;
  },
  getContentType(): string | undefined {
    return getFinalHeaders(this).get(HttpResponseHeader.CONTENT_TYPE) ?? undefined;
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
} satisfies Omit<KoriResponse, typeof KoriResponseBrand> & ThisType<ResState>;

export function createKoriResponse(): KoriResponse {
  const obj = Object.create(sharedMethods) as ResState;

  obj[KoriResponseBrand] = KoriResponseBrand;
  obj.statusCode = null;
  obj.headers = undefined;
  obj.bodyKind = 'none';
  obj.bodyValue = undefined;
  obj.built = false;

  return obj as unknown as KoriResponse;
}
