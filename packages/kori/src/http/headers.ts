/**
 * HTTP Request Header constants
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#request_headers
 */
export const HttpRequestHeader = {
  ACCEPT: 'accept',
  ACCEPT_CHARSET: 'accept-charset',
  ACCEPT_ENCODING: 'accept-encoding',
  ACCEPT_LANGUAGE: 'accept-language',
  AUTHORIZATION: 'authorization',
  CACHE_CONTROL: 'cache-control',
  CONTENT_TYPE: 'content-type',
  COOKIE: 'cookie',
  FORWARDED: 'forwarded',
  FROM: 'from',
  HOST: 'host',
  IF_MODIFIED_SINCE: 'if-modified-since',
  IF_NONE_MATCH: 'if-none-match',
  USER_AGENT: 'user-agent',
  X_FORWARDED_FOR: 'x-forwarded-for',
  X_FORWARDED_HOST: 'x-forwarded-host',
  X_FORWARDED_PROTO: 'x-forwarded-proto',
} as const;

export type HttpRequestHeaderName = (typeof HttpRequestHeader)[keyof typeof HttpRequestHeader] | (string & {});

/**
 * HTTP Response Header constants
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#response_headers
 */
export const HttpResponseHeader = {
  ACCESS_CONTROL_ALLOW_ORIGIN: 'access-control-allow-origin',
  ACCEPT_RANGES: 'accept-ranges',
  CACHE_CONTROL: 'cache-control',
  CONNECTION: 'connection',
  CONTENT_DISPOSITION: 'content-disposition',
  CONTENT_ENCODING: 'content-encoding',
  CONTENT_LENGTH: 'content-length',
  CONTENT_RANGE: 'content-range',
  CONTENT_SECURITY_POLICY: 'content-security-policy',
  CONTENT_TYPE: 'content-type',
  CROSS_ORIGIN_EMBEDDER_POLICY: 'cross-origin-embedder-policy',
  CROSS_ORIGIN_OPENER_POLICY: 'cross-origin-opener-policy',
  CROSS_ORIGIN_RESOURCE_POLICY: 'cross-origin-resource-policy',
  ETAG: 'etag',
  LAST_MODIFIED: 'last-modified',
  LOCATION: 'location',
  REFERRER_POLICY: 'referrer-policy',
  SET_COOKIE: 'set-cookie',
  STRICT_TRANSPORT_SECURITY: 'strict-transport-security',
  VARY: 'vary',
  WWW_AUTHENTICATE: 'www-authenticate',
  X_CONTENT_TYPE_OPTIONS: 'x-content-type-options',
  X_DOWNLOAD_OPTIONS: 'x-download-options',
  X_FRAME_OPTIONS: 'x-frame-options',
  X_PERMITTED_CROSS_DOMAIN_POLICIES: 'x-permitted-cross-domain-policies',
  X_XSS_PROTECTION: 'x-xss-protection',
} as const;

export type HttpResponseHeaderName = (typeof HttpResponseHeader)[keyof typeof HttpResponseHeader] | (string & {});
