/**
 * HTTP Content-Type constants for common MIME types.
 *
 * Provides standardized content-type strings to ensure consistency
 * and prevent typos in HTTP content-type handling.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
 */
export const ContentType = {
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
 * Union type representing all known content-type values with string fallback.
 *
 * Includes all predefined Content-Type constants plus any custom string values
 * for content types not explicitly listed in the ContentType object.
 */
export type ContentTypeValue = (typeof ContentType)[keyof typeof ContentType] | (string & {});

/**
 * Content-Type constants with UTF-8 charset for response headers.
 *
 * These constants include the charset parameter which is commonly needed
 * for text-based content types in HTTP responses to ensure proper character encoding.
 */
export const ContentTypeUtf8 = {
  APPLICATION_JSON: 'application/json;charset=utf-8',
  TEXT_PLAIN: 'text/plain;charset=utf-8',
  TEXT_HTML: 'text/html;charset=utf-8',
} as const;

/**
 * Union type for UTF-8 encoded content-type values.
 *
 * Represents all content types from ContentTypeUtf8 with proper charset encoding.
 */
export type ContentTypeUtf8Value = (typeof ContentTypeUtf8)[keyof typeof ContentTypeUtf8];
