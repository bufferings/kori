import { parseCookies } from '../http/index.js';
import {
  type ContentTypeValue,
  ContentType,
  DEFAULT_CONTENT_TYPE,
  type HttpRequestHeaderName,
  HttpRequestHeader,
} from '../http/index.js';

const KoriRequestBrand = Symbol('kori-request');

/**
 * Kori request object for accessing HTTP request data in handlers.
 */
export type KoriRequest = {
  [KoriRequestBrand]: typeof KoriRequestBrand;

  /**
   * Gets the raw Web API Request object for direct access to native features.
   *
   * **Warning**: Reading the body will prevent other Kori methods from working.
   * Use this when you need to access Web API features not exposed by Kori's request methods.
   *
   * @returns The underlying Request object
   */
  raw(): Request;

  /**
   * Gets the parsed URL object.
   *
   * @returns URL object for the request
   */
  url(): URL;

  /**
   * Gets the HTTP method.
   *
   * @returns HTTP method string (GET, POST, etc.)
   */
  method(): string;

  /**
   * Gets the path parameters extracted from the route pattern.
   *
   * @returns Object containing path parameter key-value pairs
   *
   * @example
   * ```typescript
   * // For route '/users/:id' and request '/users/123'
   * ctx.req.pathParams() // { id: '123' }
   * ```
   */
  pathParams(): Record<string, string>;

  /**
   * Gets the path template pattern used for routing.
   *
   * @returns Path template string with parameter placeholders
   *
   * @example
   * ```typescript
   * // For route '/users/:id'
   * ctx.req.pathTemplate() // '/users/:id'
   * ```
   */
  pathTemplate(): string;

  /**
   * Gets the parsed query parameters from the URL.
   *
   * Single values are returned as strings, multiple values as string arrays.
   *
   * @returns Object containing query parameter key-value pairs
   *
   * @example
   * ```typescript
   * // For URL '/search?q=hello&tags=a&tags=b'
   * ctx.req.queryParams() // { q: 'hello', tags: ['a', 'b'] }
   * ```
   */
  queryParams(): Record<string, string | string[]>;

  /**
   * Gets all request headers as a lowercase-keyed object.
   *
   * Headers are cached on first access for performance.
   *
   * @returns Object containing all header key-value pairs
   */
  headers(): Record<string, string>;

  /**
   * Gets a specific header value by name.
   *
   * @param name - Header name (case-insensitive)
   * @returns Header value or undefined if not present
   */
  header(name: HttpRequestHeaderName): string | undefined;

  /**
   * Gets the full content-type header value including parameters.
   *
   * @returns Full content-type string or undefined if not present
   *
   * @example
   * ```typescript
   * ctx.req.fullContentType() // 'application/json; charset=utf-8'
   * ```
   */
  fullContentType(): string | undefined;

  /**
   * Gets the main content-type value without parameters.
   *
   * @returns content-type without parameters or undefined if not present
   *
   * @example
   * ```typescript
   * ctx.req.contentType() // 'application/json'
   * ```
   */
  contentType(): ContentTypeValue | undefined;

  /**
   * Gets all cookies as a key-value object.
   *
   * Cookies are parsed and cached on first access.
   *
   * @returns Object containing all cookie key-value pairs
   */
  cookies(): Record<string, string>;

  /**
   * Gets a specific cookie value by name.
   *
   * @param name - Cookie name
   * @returns Cookie value or undefined if not present
   */
  cookie(name: string): string | undefined;

  /**
   * Parses the request body as JSON.
   *
   * The result is cached to avoid multiple parsing of the same body.
   *
   * @returns Promise resolving to parsed JSON data
   */
  bodyJson(): Promise<unknown>;

  /**
   * Reads the request body as text.
   *
   * The result is cached to avoid multiple reads of the same body.
   *
   * @returns Promise resolving to body text
   */
  bodyText(): Promise<string>;

  /**
   * Parses the request body as FormData.
   *
   * The result is cached to avoid multiple parsing of the same body.
   *
   * @returns Promise resolving to FormData object
   */
  bodyFormData(): Promise<FormData>;

  /**
   * Reads the request body as ArrayBuffer.
   *
   * The result is cached to avoid multiple reads of the same body.
   *
   * @returns Promise resolving to ArrayBuffer
   */
  bodyArrayBuffer(): Promise<ArrayBuffer>;

  /**
   * Gets a readable stream of the request body.
   *
   * **Note**: Returns a new stream each time as ReadableStreams can only be consumed once.
   *
   * @returns ReadableStream for the body or null if no body
   */
  bodyStream(): ReadableStream<Uint8Array> | null;

  /**
   * Parses the request body based on content-type header.
   *
   * Automatically chooses the appropriate parsing method:
   * - `application/json` -> JSON parsing
   * - `application/x-www-form-urlencoded` -> FormData
   * - `multipart/form-data` -> FormData
   * - `application/octet-stream` -> ArrayBuffer
   * - Other types -> Text
   *
   * The result is cached to avoid multiple parsing of the same body.
   *
   * @returns Promise resolving to parsed body data
   */
  parseBody(): Promise<unknown>;
};

/** Cache for parsed body data to avoid re-parsing */
type BodyCache = {
  json?: Promise<unknown>;
  text?: Promise<string>;
  formData?: Promise<FormData>;
  arrayBuffer?: Promise<ArrayBuffer>;
};

/** Internal state structure for request object */
type ReqState = {
  [KoriRequestBrand]: typeof KoriRequestBrand;
  raw: Request;
  pathParamsValue: Record<string, string>;
  pathTemplateValue: string;
  bodyCache: BodyCache;
  clonedRawRequest?: Request;
  urlCache?: URL;
  methodCache?: string;
  queriesCache?: Record<string, string | string[]>;
  headersCache?: Record<string, string>;
  cookiesCache?: Record<string, string>;
};

function getUrlInternal(req: ReqState): URL {
  req.urlCache ??= new URL(req.raw.url);
  return req.urlCache;
}

function getMethodInternal(req: ReqState): string {
  req.methodCache ??= req.raw.method;
  return req.methodCache;
}

function getPathParamsInternal(req: ReqState): Record<string, string> {
  return req.pathParamsValue;
}

function getPathTemplateInternal(req: ReqState): string {
  return req.pathTemplateValue;
}

function getQueryParamsInternal(req: ReqState): Record<string, string | string[]> {
  if (req.queriesCache) {
    return req.queriesCache;
  }

  const rawParams = new URLSearchParams(getUrlInternal(req).search);
  const obj: Record<string, string | string[]> = {};
  for (const key of rawParams.keys()) {
    const vals = rawParams.getAll(key);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    obj[key] = vals.length === 1 ? vals[0]! : vals;
  }
  req.queriesCache = obj;
  return obj;
}

/** Caches headers as lowercase-keyed object for performance */
function getHeadersInternal(req: ReqState): Record<string, string> {
  if (req.headersCache) {
    return req.headersCache;
  }

  const rawHeaders = new Headers(req.raw.headers);
  const obj: Record<string, string> = {};
  rawHeaders.forEach((v, k) => {
    obj[k] = v;
  });
  req.headersCache = obj;
  return obj;
}

function getHeaderInternal(req: ReqState, name: HttpRequestHeaderName): string | undefined {
  return getHeadersInternal(req)[name.toLowerCase()];
}

function getFullContentTypeInternal(req: ReqState): string | undefined {
  return getHeaderInternal(req, HttpRequestHeader.CONTENT_TYPE)?.trim().toLowerCase();
}

function getContentTypeInternal(req: ReqState): ContentTypeValue | undefined {
  return getFullContentTypeInternal(req)?.split(';')[0]?.trim() as ContentTypeValue | undefined;
}

function getCookiesInternal(req: ReqState): Record<string, string> {
  if (req.cookiesCache) {
    return req.cookiesCache;
  }

  const cookieHeader = getHeaderInternal(req, HttpRequestHeader.COOKIE);
  req.cookiesCache = parseCookies(cookieHeader);
  return req.cookiesCache;
}

function getCookieInternal(req: ReqState, name: string): string | undefined {
  return getCookiesInternal(req)[name];
}

function getBodyJsonInternal(req: ReqState): Promise<unknown> {
  req.bodyCache.json ??= req.raw.clone().json();
  return req.bodyCache.json;
}

function getBodyTextInternal(req: ReqState): Promise<string> {
  req.bodyCache.text ??= req.raw.clone().text();
  return req.bodyCache.text;
}

function getBodyFormDataInternal(req: ReqState): Promise<FormData> {
  req.bodyCache.formData ??= req.raw.clone().formData();
  return req.bodyCache.formData;
}

function getBodyArrayBufferInternal(req: ReqState): Promise<ArrayBuffer> {
  req.bodyCache.arrayBuffer ??= req.raw.clone().arrayBuffer();
  return req.bodyCache.arrayBuffer;
}

function getBodyStreamInternal(req: ReqState): ReadableStream<Uint8Array> | null {
  // Don't cache stream - ReadableStreams are single-use and can't be reused after consumption
  return req.raw.clone().body;
}

function parseBodyInternal(req: ReqState): Promise<unknown> {
  const ct = getContentTypeInternal(req) ?? DEFAULT_CONTENT_TYPE;
  switch (ct) {
    case DEFAULT_CONTENT_TYPE:
      return getBodyJsonInternal(req);
    case ContentType.APPLICATION_FORM_URLENCODED:
    case ContentType.MULTIPART_FORM_DATA:
      return getBodyFormDataInternal(req);
    case ContentType.APPLICATION_OCTET_STREAM:
      return getBodyArrayBufferInternal(req);
    default:
      return getBodyTextInternal(req);
  }
}

/** Shared methods prototype for memory efficiency */
const sharedMethods = {
  raw(): Request {
    return this.raw;
  },

  url(): URL {
    return getUrlInternal(this);
  },
  method(): string {
    return getMethodInternal(this);
  },
  pathParams(): Record<string, string> {
    return getPathParamsInternal(this);
  },
  pathTemplate(): string {
    return getPathTemplateInternal(this);
  },
  queryParams(): Record<string, string | string[]> {
    return getQueryParamsInternal(this);
  },

  headers(): Record<string, string> {
    return getHeadersInternal(this);
  },
  header(name: HttpRequestHeaderName): string | undefined {
    return getHeaderInternal(this, name);
  },
  fullContentType(): string | undefined {
    return getFullContentTypeInternal(this);
  },
  contentType(): ContentTypeValue | undefined {
    return getContentTypeInternal(this);
  },

  cookies(): Record<string, string> {
    return getCookiesInternal(this);
  },
  cookie(name: string): string | undefined {
    return getCookieInternal(this, name);
  },

  bodyJson(): Promise<unknown> {
    return getBodyJsonInternal(this);
  },
  bodyText(): Promise<string> {
    return getBodyTextInternal(this);
  },
  bodyFormData(): Promise<FormData> {
    return getBodyFormDataInternal(this);
  },
  bodyArrayBuffer(): Promise<ArrayBuffer> {
    return getBodyArrayBufferInternal(this);
  },
  bodyStream(): ReadableStream<Uint8Array> | null {
    return getBodyStreamInternal(this);
  },

  parseBody() {
    return parseBodyInternal(this);
  },
} satisfies Omit<KoriRequest, typeof KoriRequestBrand> & ThisType<ReqState>;

/**
 * Creates a new Kori request object.
 *
 * @packageInternal Framework infrastructure for creating request objects
 *
 * @param params - Request creation parameters
 * @param params.rawRequest - The raw Web API Request object
 * @param params.pathParams - Path parameters extracted from routing
 * @param params.pathTemplate - The path template used for routing
 * @returns New KoriRequest instance
 */
export function createKoriRequest({
  rawRequest,
  pathParams,
  pathTemplate,
}: {
  rawRequest: Request;
  pathParams: Record<string, string>;
  pathTemplate: string;
}): KoriRequest {
  const obj = Object.create(sharedMethods) as ReqState;

  obj[KoriRequestBrand] = KoriRequestBrand;
  obj.raw = rawRequest;
  obj.pathParamsValue = pathParams;
  obj.pathTemplateValue = pathTemplate;
  obj.bodyCache = {};
  return obj as unknown as KoriRequest;
}
