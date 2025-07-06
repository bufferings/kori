import { type ContentTypeValue, ContentType } from '../http/index.js';
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
  fullContentType(): string | undefined;
  parseBody(): Promise<unknown>;
  parseBodyDefault(): Promise<unknown>;
  parseBodyCustom?: () => Promise<unknown>;

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

  function contentType(): ContentTypeValue | undefined {
    return fullContentType()?.split(';')[0]?.trim() as ContentTypeValue | undefined;
  }

  function fullContentType(): string | undefined {
    return rawRequest.headers.get('content-type')?.trim().toLowerCase();
  }

  function parseBody(): Promise<unknown> {
    return koriRequest.parseBodyCustom ? koriRequest.parseBodyCustom() : parseBodyDefault();
  }

  function parseBodyDefault(): Promise<unknown> {
    const contentTypeValue = contentType() ?? ContentType.APPLICATION_JSON;

    switch (contentTypeValue) {
      case ContentType.APPLICATION_JSON:
        return json();
      case ContentType.APPLICATION_FORM_URLENCODED:
      case ContentType.MULTIPART_FORM_DATA:
        return formData();
      case ContentType.APPLICATION_OCTET_STREAM:
        return arrayBuffer();
      default:
        return text();
    }
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
    contentType,
    fullContentType,
    parseBody,
    parseBodyDefault,
    json,
    text,
    formData,
    arrayBuffer,
  };

  return koriRequest;
}
