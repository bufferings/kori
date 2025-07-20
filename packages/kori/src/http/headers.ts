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
  CONTENT_ENCODING: 'content-encoding',
  CONTENT_TYPE: 'content-type',
  ETAG: 'etag',
  LOCATION: 'location',
  SET_COOKIE: 'set-cookie',
  STRICT_TRANSPORT_SECURITY: 'strict-transport-security',
  VARY: 'vary',
  WWW_AUTHENTICATE: 'www-authenticate',
} as const;

export type HttpResponseHeaderName = (typeof HttpResponseHeader)[keyof typeof HttpResponseHeader] | (string & {});
