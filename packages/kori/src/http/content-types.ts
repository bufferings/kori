/**
 * HTTP Media Type constants for common MIME types.
 *
 * Provides standardized media type strings to ensure consistency
 * and prevent typos in HTTP content-type handling.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
 */
export const MediaType = {
  APPLICATION_JSON: 'application/json',
  APPLICATION_FORM_URLENCODED: 'application/x-www-form-urlencoded',
  MULTIPART_FORM_DATA: 'multipart/form-data',
  TEXT_PLAIN: 'text/plain',
  TEXT_HTML: 'text/html',
  TEXT_CSS: 'text/css',
  TEXT_JAVASCRIPT: 'text/javascript',
  APPLICATION_OCTET_STREAM: 'application/octet-stream',
  APPLICATION_XML: 'application/xml',
  TEXT_XML: 'text/xml',
} as const;

/**
 * Content-Type constants with UTF-8 charset for response headers.
 *
 * These constants include the charset parameter which is commonly needed
 * for text-based content types in HTTP responses to ensure proper character encoding.
 */
export const ContentType = {
  ...MediaType,
  APPLICATION_JSON_UTF8: 'application/json; charset=utf-8',
  TEXT_PLAIN_UTF8: 'text/plain; charset=utf-8',
  TEXT_HTML_UTF8: 'text/html; charset=utf-8',
} as const;
