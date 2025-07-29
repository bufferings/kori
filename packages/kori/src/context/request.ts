import { parseCookies } from '../http/index.js';
import {
  type ContentTypeValue,
  ContentType,
  DEFAULT_CONTENT_TYPE,
  type HttpRequestHeaderName,
  HttpRequestHeader,
} from '../http/index.js';
import { type KoriLogger } from '../logging/index.js';

const KoriRequestBrand = Symbol('kori-request');

export type KoriRequest = {
  [KoriRequestBrand]: typeof KoriRequestBrand;

  raw(): Request;

  log(): KoriLogger;
  url(): URL;
  method(): string;
  pathParams(): Record<string, string>;
  queryParams(): Record<string, string | string[]>;

  headers(): Record<string, string>;
  header(name: HttpRequestHeaderName): string | undefined;
  fullContentType(): string | undefined;
  contentType(): ContentTypeValue | undefined;

  cookies(): Record<string, string>;
  cookie(name: string): string | undefined;

  bodyJson(): Promise<unknown>;
  bodyText(): Promise<string>;
  bodyFormData(): Promise<FormData>;
  bodyArrayBuffer(): Promise<ArrayBuffer>;
  bodyStream(): ReadableStream<Uint8Array> | null;

  parseBody(): Promise<unknown>;
};

type BodyCache = {
  json?: Promise<unknown>;
  text?: Promise<string>;
  formData?: Promise<FormData>;
  arrayBuffer?: Promise<ArrayBuffer>;
};

type ReqState = {
  [KoriRequestBrand]: typeof KoriRequestBrand;
  raw: Request;
  rootLogger: KoriLogger;
  pathParams: Record<string, string>;
  bodyCache: BodyCache;

  clonedRawRequest?: Request;
  logCache?: KoriLogger;
  urlCache?: URL;
  methodCache?: string;
  queriesCache?: Record<string, string | string[]>;
  headersCache?: Record<string, string>;
  cookiesCache?: Record<string, string>;
};

function getLogInternal(req: ReqState): KoriLogger {
  req.logCache ??= req.rootLogger.child('request');
  return req.logCache;
}

function getUrlInternal(req: ReqState): URL {
  req.urlCache ??= new URL(req.raw.url);
  return req.urlCache;
}

function getMethodInternal(req: ReqState): string {
  req.methodCache ??= req.raw.method;
  return req.methodCache;
}

function getPathParamsInternal(req: ReqState): Record<string, string> {
  return req.pathParams;
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

/**
 * Caches and returns request headers as a lowercase-keyed plain object for performance.
 *
 * Iterating over a `Headers` object can be slow. This function converts the headers
 * to a plain `Record<string, string>` on the first call and caches the result.
 * Subsequent calls return the cached object, providing faster access.
 *
 * Note: The keys are normalized to lowercase during the conversion process,
 * as `Headers.forEach` provides lowercase keys.
 */
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

function getBodyStreamInternal(req: ReqState): ReadableStream | null {
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

// -----------------------------------------------------------
// Shared methods object (no per-request closures)
// -----------------------------------------------------------
const sharedMethods = {
  raw(): Request {
    return this.raw;
  },

  log(): KoriLogger {
    return getLogInternal(this);
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
  bodyStream(): ReadableStream | null {
    return getBodyStreamInternal(this);
  },

  parseBody() {
    return parseBodyInternal(this);
  },
} satisfies Omit<KoriRequest, typeof KoriRequestBrand> & ThisType<ReqState>;

export function createKoriRequest({
  rawRequest,
  pathParams,
  rootLogger,
}: {
  rawRequest: Request;
  pathParams: Record<string, string>;
  rootLogger: KoriLogger;
}): KoriRequest {
  const obj = Object.create(sharedMethods) as ReqState;

  obj[KoriRequestBrand] = KoriRequestBrand;
  obj.raw = rawRequest;
  obj.rootLogger = rootLogger;
  obj.pathParams = pathParams;
  obj.bodyCache = {};
  return obj as unknown as KoriRequest;
}
