import { type ContentTypeValue } from '../http/index.js';
import { type KoriLogger } from '../logging/index.js';

const KoriRequestBrand = Symbol('kori-request');

export type KoriRequest<PathParams extends Record<string, string> = Record<string, string>> = {
  [KoriRequestBrand]: typeof KoriRequestBrand;
  log: KoriLogger;
  raw: Request;

  url: URL;
  method: string;
  pathParams: PathParams;
  queryParams: Record<string, string | string[]>;
  headers: Record<string, string>;

  contentType(): ContentTypeValue | undefined;

  json(): Promise<unknown>;
  text(): Promise<string>;
  formData(): Promise<FormData>;
  arrayBuffer(): Promise<ArrayBuffer>;
};

type BodyCache = {
  json?: Promise<unknown>;
  text?: Promise<string>;
  formData?: Promise<FormData>;
  arrayBuffer?: Promise<ArrayBuffer>;
};

export function createKoriRequest<PathParams extends Record<string, string>>({
  rawRequest,
  pathParams,
  rootLogger,
}: {
  rawRequest: Request;
  pathParams: PathParams;
  rootLogger: KoriLogger;
}): KoriRequest<PathParams> {
  const url = new URL(rawRequest.url);

  const requestLogger = rootLogger.child('request');

  const bodyCache: BodyCache = {};
  let queriesCache: Record<string, string | string[]> | undefined;
  let headersCache: Record<string, string> | undefined;
  let clonedRawRequest: Request | undefined = undefined;

  function getClonedRawRequest(): Request {
    clonedRawRequest ??= rawRequest.clone();
    return clonedRawRequest;
  }

  function json(): Promise<unknown> {
    bodyCache.json ??= getClonedRawRequest().json();
    return bodyCache.json;
  }

  function text(): Promise<string> {
    bodyCache.text ??= getClonedRawRequest().text();
    return bodyCache.text;
  }

  function formData(): Promise<FormData> {
    bodyCache.formData ??= getClonedRawRequest().formData();
    return bodyCache.formData;
  }

  function arrayBuffer(): Promise<ArrayBuffer> {
    bodyCache.arrayBuffer ??= getClonedRawRequest().arrayBuffer();
    return bodyCache.arrayBuffer;
  }

  const koriRequest: KoriRequest<PathParams> = {
    [KoriRequestBrand]: KoriRequestBrand,
    log: requestLogger,
    raw: rawRequest,
    url,
    method: rawRequest.method,
    pathParams,
    get queryParams() {
      if (queriesCache) {
        return queriesCache;
      }
      const rawQueryParams = new URLSearchParams(url.search);
      const obj: Record<string, string | string[]> = {};
      for (const key of rawQueryParams.keys()) {
        const values = rawQueryParams.getAll(key);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        obj[key] = values.length === 1 ? values[0]! : values;
      }
      queriesCache = obj;
      return obj;
    },
    get headers() {
      if (headersCache) {
        return headersCache;
      }
      const rawHeaders = new Headers(rawRequest.headers);
      const obj: Record<string, string> = {};
      rawHeaders.forEach((value, key) => {
        obj[key] = value;
      });
      headersCache = obj;
      return obj;
    },
    contentType() {
      const header = rawRequest.headers.get('content-type');
      return header?.split(';')[0]?.trim().toLowerCase() as ContentTypeValue | undefined;
    },
    json,
    text,
    formData,
    arrayBuffer,
  };

  return koriRequest;
}
