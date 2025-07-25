/**
 * HTTP Content-Type constants
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
 */
export const ContentType = {
  /**
   * **application/json**
   * JSON data format
   */
  APPLICATION_JSON: 'application/json',

  /**
   * **application/x-www-form-urlencoded**
   * HTML form data encoded as key-value pairs
   */
  APPLICATION_FORM_URLENCODED: 'application/x-www-form-urlencoded',

  /**
   * **multipart/form-data**
   * Form data with file uploads
   */
  MULTIPART_FORM_DATA: 'multipart/form-data',

  /**
   * **text/plain**
   * Plain text without any formatting
   */
  TEXT_PLAIN: 'text/plain',

  /**
   * **text/html**
   * HTML documents
   */
  TEXT_HTML: 'text/html',

  /**
   * **text/css**
   * CSS stylesheets
   */
  TEXT_CSS: 'text/css',

  /**
   * **text/javascript**
   * JavaScript code
   */
  TEXT_JAVASCRIPT: 'text/javascript',

  /**
   * **application/octet-stream**
   * Binary data
   */
  APPLICATION_OCTET_STREAM: 'application/octet-stream',

  /**
   * **application/xml**
   * XML documents
   */
  APPLICATION_XML: 'application/xml',

  /**
   * **text/xml**
   * XML as plain text
   */
  TEXT_XML: 'text/xml',
} as const;

/**
 * Default Content-Type
 *
 * The default Content-Type used when no Content-Type is specified in the request.
 * This ensures consistent behavior across request parsing and schema resolution.
 */
export const DEFAULT_CONTENT_TYPE = ContentType.APPLICATION_JSON;

/**
 * Represents a union of all known Content-Type values.
 * It also includes `string` as a fallback for any content types not explicitly listed.
 */
export type ContentTypeValue = (typeof ContentType)[keyof typeof ContentType] | (string & {});

// -----------------------------------------------------------
// UTF-8 suffixed Content-Type constants used frequently in responses
// -----------------------------------------------------------
export const ContentTypeUtf8 = {
  APPLICATION_JSON: 'application/json;charset=utf-8',
  TEXT_PLAIN: 'text/plain;charset=utf-8',
  TEXT_HTML: 'text/html;charset=utf-8',
} as const;

export type ContentTypeUtf8Value = (typeof ContentTypeUtf8)[keyof typeof ContentTypeUtf8];
