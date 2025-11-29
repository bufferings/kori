import { parseCookies, type HttpRequestHeaderName, HttpRequestHeader } from '../http/index.js';

import { parseQueryParam, parseQueryParamArray, parseAllQueryParams } from './request-query.js';

/**
 * Kori request object for accessing HTTP request data in handlers.
 */
export type KoriRequest = {
  koriKind: 'kori-request';

  /**
   * Gets the raw Web API Request object for direct access to native features.
   *
   * Warning: Reading the body will prevent other Kori methods from working.
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
   * Gets all path parameters extracted from the route pattern.
   *
   * @returns Object containing path parameter key-value pairs
   *
   * Note: Returns a null-prototype object (`Object.create(null)`).
   * Do not use methods like `hasOwnProperty` directly on the returned object.
   *
   * @example
   * ```typescript
   * // For route '/users/:id' and request '/users/123'
   * ctx.req.params() // { id: '123' }
   * ```
   */
  params(): Record<string, string>;

  /**
   * Gets a specific path parameter value by name.
   *
   * @param name - Path parameter name
   * @returns Path parameter value or undefined if not present
   *
   * @example
   * ```typescript
   * // For route '/users/:id' and request '/users/123'
   * ctx.req.param('id') // '123'
   * ```
   */
  param(name: string): string | undefined;

  /**
   * Gets all query parameters from the URL.
   *
   * Single values are returned as strings, multiple values as string arrays.
   *
   * @returns Object containing query parameter key-value pairs
   *
   * Note: Returns a null-prototype object (`Object.create(null)`).
   * Do not use methods like `hasOwnProperty` directly on the returned object.
   *
   * @example
   * ```typescript
   * // For URL '/search?q=hello&tags=a&tags=b'
   * ctx.req.queries() // { q: 'hello', tags: ['a', 'b'] }
   * ```
   */
  queries(): Record<string, string | string[]>;

  /**
   * Gets a specific query parameter value by name.
   *
   * @param name - Query parameter name
   * @returns First value for the parameter or undefined if not present
   *
   * @example
   * ```typescript
   * // For URL '/search?q=hello'
   * ctx.req.query('q') // 'hello'
   * ```
   */
  query(name: string): string | undefined;

  /**
   * Gets all values for a specific query parameter as an array.
   *
   * @param name - Query parameter name
   * @returns Array of all values for the parameter or undefined if not present
   *
   * @example
   * ```typescript
   * // For URL '/search?tags=a&tags=b'
   * ctx.req.queryArray('tags') // ['a', 'b']
   * ```
   */
  queryArray(name: string): string[] | undefined;

  /**
   * Gets all request headers as a lowercase-keyed object.
   *
   * Header names are normalized to lowercase for case-insensitive access.
   * Header values are returned verbatim; no normalization is applied.
   *
   * Headers are cached on first access for performance.
   *
   * Note: Returns a null-prototype object (`Object.create(null)`).
   * Do not use methods like `hasOwnProperty` directly on the returned object.
   *
   * @returns Object containing all header key-value pairs
   */
  headers(): Record<string, string>;

  /**
   * Gets a specific header value by name.
   *
   * Name matching is case-insensitive. The returned value is the
   * original header value (verbatim), without normalization.
   *
   * @param name - Header name (case-insensitive)
   * @returns Header value or undefined if not present
   */
  header(name: HttpRequestHeaderName): string | undefined;

  /**
   * Gets the content-type header value including parameters.
   *
   * Returns a normalized value:
   * - Lowercases the media type and parameter names
   * - Normalizes separators to a single "; " (semicolon + single space)
   * - Removes spaces around "=" in parameters (e.g., "charset = UTF-8" -> "charset=UTF-8")
   * - Preserves parameter order and values (case-sensitive)
   *
   * Examples:
   * - "Application/JSON; Charset=UTF-8" -> "application/json; charset=UTF-8"
   * - "  Text/HTML ; Charset = UTF-8  " -> "text/html; charset=UTF-8"
   *
   * @returns Content-type header value (normalized) or undefined if not present
   *
   * @example
   * ```typescript
   * ctx.req.contentType() // 'application/json; charset=UTF-8'
   * ```
   */
  contentType(): string | undefined;

  /**
   * Gets the media type from the content-type header.
   *
   * Returns the media type without parameters, normalized to lowercase.
   * For example, "Application/JSON; charset=utf-8" becomes "application/json".
   *
   * @returns Media type or undefined if content-type header not present
   *
   * @example
   * ```typescript
   * ctx.req.mediaType() // 'application/json'
   * ```
   */
  mediaType(): string | undefined;

  /**
   * Gets all cookies as a key-value object.
   *
   * Cookies are parsed and cached on first access.
   *
   * Note: Returns a null-prototype object (`Object.create(null)`).
   * Do not use methods like `hasOwnProperty` directly on the returned object.
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
   * The result is cached. If the body was already read in another format
   * (e.g., text), it will be converted from the cached value.
   *
   * @returns Promise resolving to parsed JSON data
   * @throws When the body stream cannot be read or the content is not valid JSON
   */
  bodyJson(): Promise<unknown>;

  /**
   * Reads the request body as text.
   *
   * The result is cached. If the body was already read in another format,
   * it will be converted from the cached value.
   *
   * @returns Promise resolving to body text
   * @throws When the body stream cannot be read
   */
  bodyText(): Promise<string>;

  /**
   * Parses the request body as FormData.
   *
   * The result is cached. If the body was already read in another format,
   * it will be converted from the cached value.
   *
   * @returns Promise resolving to FormData object
   * @throws When the body stream cannot be read or the content is not valid form data
   */
  bodyFormData(): Promise<FormData>;

  /**
   * Reads the request body as ArrayBuffer.
   *
   * The result is cached. If the body was already read in another format,
   * it will be converted from the cached value.
   *
   * @returns Promise resolving to ArrayBuffer
   * @throws When the body stream cannot be read
   */
  bodyArrayBuffer(): Promise<ArrayBuffer>;

  /**
   * Gets a readable stream of the request body.
   *
   * Returns the raw body stream, which can only be consumed once per Web standards.
   * Once consumed, the stream cannot be read again.
   *
   * Note: After calling this method, other body methods (bodyJson, bodyText, etc.)
   * may not work if the stream is consumed. Use body methods before accessing the stream,
   * or use body methods exclusively without accessing the stream.
   *
   * @returns ReadableStream for the body or null if no body
   */
  bodyStream(): ReadableStream<Uint8Array> | null;
};

/** Cache for parsed body data to avoid re-parsing */
type BodyCache = {
  json?: Promise<unknown>;
  text?: Promise<unknown>;
  formData?: Promise<unknown>;
  arrayBuffer?: Promise<unknown>;
};

/** Internal state structure for request object */
type ReqState = {
  koriKind: 'kori-request';
  rawRequest: Request;

  urlCache?: URL;
  methodCache?: string;
  pathTemplateValue: string;

  paramsValue: Record<string, string>;
  queriesCache?: Record<string, string | string[]>;
  querySingleValueCache?: Map<string, string | undefined>;
  queryArrayValueCache?: Map<string, string[] | undefined>;
  headersCache?: Record<string, string>;
  contentTypeCache?: string | undefined;
  hasContentTypeCache?: boolean;
  mediaTypeCache?: string | undefined;
  hasMediaTypeCache?: boolean;
  cookiesCache?: Record<string, string>;

  bodyCache: BodyCache;
};

function getUrlInternal(req: ReqState): URL {
  req.urlCache ??= new URL(req.rawRequest.url);
  return req.urlCache;
}

function getMethodInternal(req: ReqState): string {
  req.methodCache ??= req.rawRequest.method;
  return req.methodCache;
}

function getPathTemplateInternal(req: ReqState): string {
  return req.pathTemplateValue;
}

function getParamsInternal(req: ReqState): Record<string, string> {
  return req.paramsValue;
}

function getParamInternal(req: ReqState, name: string): string | undefined {
  return req.paramsValue[name];
}

function getQueriesInternal(req: ReqState): Record<string, string | string[]> {
  req.queriesCache ??= parseAllQueryParams(req.rawRequest.url);
  return req.queriesCache;
}

function getQueryInternal(req: ReqState, name: string): string | undefined {
  if (req.querySingleValueCache?.has(name)) {
    return req.querySingleValueCache.get(name);
  }

  const value = parseQueryParam(req.rawRequest.url, name);
  req.querySingleValueCache ??= new Map();
  req.querySingleValueCache.set(name, value);
  return value;
}

function getQueryArrayInternal(req: ReqState, name: string): string[] | undefined {
  if (req.queryArrayValueCache?.has(name)) {
    return req.queryArrayValueCache.get(name);
  }

  const result = parseQueryParamArray(req.rawRequest.url, name);
  req.queryArrayValueCache ??= new Map();
  req.queryArrayValueCache.set(name, result);
  return result;
}

/** Caches headers as lowercase-keyed object for performance */
function getHeadersInternal(req: ReqState): Record<string, string> {
  if (req.headersCache) {
    return req.headersCache;
  }

  const obj = Object.create(null) as Record<string, string>;
  req.rawRequest.headers.forEach((v, k) => {
    obj[k.toLowerCase()] = v;
  });
  req.headersCache = obj;
  return obj;
}

function getHeaderInternal(req: ReqState, name: HttpRequestHeaderName): string | undefined {
  if (req.headersCache) {
    return req.headersCache[name.toLowerCase()];
  }
  return req.rawRequest.headers.get(name.toLowerCase()) ?? undefined;
}

function getContentTypeInternal(req: ReqState): string | undefined {
  if (req.hasContentTypeCache) {
    return req.contentTypeCache;
  }
  const value = getHeaderInternal(req, HttpRequestHeader.CONTENT_TYPE);
  if (!value?.trim()) {
    req.hasContentTypeCache = true;
    req.contentTypeCache = undefined;
    req.hasMediaTypeCache = true;
    req.mediaTypeCache = undefined;
    return undefined;
  }

  const parts = value.split(';');

  const mediaTypePart = parts[0]?.trim();
  if (!mediaTypePart) {
    req.hasContentTypeCache = true;
    req.contentTypeCache = undefined;
    req.hasMediaTypeCache = true;
    req.mediaTypeCache = undefined;
    return undefined;
  }

  const lowerMediaType = mediaTypePart.toLowerCase();
  req.hasMediaTypeCache = true;
  req.mediaTypeCache = lowerMediaType;

  const normalized = parts
    .map((part, index) => {
      if (index === 0) {
        return lowerMediaType;
      }

      const trimmed = part.trim();
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) {
        return trimmed.toLowerCase();
      }
      const name = trimmed.slice(0, eqIndex).trim().toLowerCase();
      const val = trimmed.slice(eqIndex + 1).trim();
      return `${name}=${val}`;
    })
    .join('; ');
  req.hasContentTypeCache = true;
  req.contentTypeCache = normalized;
  return normalized;
}

function getMediaTypeInternal(req: ReqState): string | undefined {
  if (req.hasMediaTypeCache) {
    return req.mediaTypeCache;
  }
  getContentTypeInternal(req);
  return req.mediaTypeCache;
}

function getCookiesInternal(req: ReqState): Record<string, string> {
  if (req.cookiesCache) {
    return req.cookiesCache;
  }
  const cookieHeader = getHeaderInternal(req, HttpRequestHeader.COOKIE);
  const parsed = parseCookies({ cookieHeader });
  req.cookiesCache = parsed;
  return parsed;
}

function getCookieInternal(req: ReqState, name: string): string | undefined {
  const allCookies = getCookiesInternal(req);
  return allCookies[name];
}

function cachedBody(req: ReqState, key: keyof BodyCache): Promise<unknown> {
  const cachedValue = req.bodyCache[key];
  if (cachedValue) {
    return cachedValue;
  }

  const keys = Object.keys(req.bodyCache) as (keyof BodyCache)[];
  const sourceKey = keys.find((k) => k !== 'json');

  if (sourceKey) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const bodyPromise = req.bodyCache[sourceKey]!.then<unknown>((body) => {
      return new Response(body as BodyInit)[key]();
    });
    return (req.bodyCache[key] = bodyPromise);
  }

  if (key === 'json') {
    req.bodyCache.text = req.rawRequest.text();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return (req.bodyCache.json = req.bodyCache.text.then((text) => JSON.parse(text as string)));
  }

  return (req.bodyCache[key] = req.rawRequest[key]());
}

function getBodyJsonInternal(req: ReqState): Promise<unknown> {
  return cachedBody(req, 'json');
}

function getBodyTextInternal(req: ReqState): Promise<string> {
  return cachedBody(req, 'text') as Promise<string>;
}

function getBodyFormDataInternal(req: ReqState): Promise<FormData> {
  return cachedBody(req, 'formData') as Promise<FormData>;
}

function getBodyArrayBufferInternal(req: ReqState): Promise<ArrayBuffer> {
  return cachedBody(req, 'arrayBuffer') as Promise<ArrayBuffer>;
}

function getBodyStreamInternal(req: ReqState): ReadableStream<Uint8Array> | null {
  return req.rawRequest.body;
}

/** Shared methods prototype for memory efficiency */
const sharedMethods = {
  raw(): Request {
    return this.rawRequest;
  },

  url(): URL {
    return getUrlInternal(this);
  },
  method(): string {
    return getMethodInternal(this);
  },
  pathTemplate(): string {
    return getPathTemplateInternal(this);
  },

  params(): Record<string, string> {
    return getParamsInternal(this);
  },
  param(name: string): string | undefined {
    return getParamInternal(this, name);
  },

  queries(): Record<string, string | string[]> {
    return getQueriesInternal(this);
  },
  query(name: string): string | undefined {
    return getQueryInternal(this, name);
  },
  queryArray(name: string): string[] | undefined {
    return getQueryArrayInternal(this, name);
  },

  headers(): Record<string, string> {
    return getHeadersInternal(this);
  },
  header(name: HttpRequestHeaderName): string | undefined {
    return getHeaderInternal(this, name);
  },
  contentType(): string | undefined {
    return getContentTypeInternal(this);
  },
  mediaType(): string | undefined {
    return getMediaTypeInternal(this);
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
} satisfies Omit<KoriRequest, 'koriKind'> & ThisType<ReqState>;

/**
 * Creates a new Kori request object.
 *
 * @packageInternal Framework infrastructure for creating request objects
 *
 * @param options.rawRequest - The raw Web API Request object
 * @param options.pathParams - Path parameters extracted from routing
 * @param options.pathTemplate - The path template used for routing
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

  obj.koriKind = 'kori-request';
  obj.rawRequest = rawRequest;
  obj.pathTemplateValue = pathTemplate;

  // Create a null-prototype object for path params to prevent prototype pollution
  // and isolate from external reference changes
  const safeParams = Object.create(null) as Record<string, string>;
  Object.assign(safeParams, pathParams);
  obj.paramsValue = safeParams;

  obj.bodyCache = {};
  obj.hasContentTypeCache = false;
  obj.hasMediaTypeCache = false;
  return obj as unknown as KoriRequest;
}
