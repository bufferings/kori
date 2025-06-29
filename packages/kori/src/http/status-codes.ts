/**
 * HTTP Status Codes
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
 */
export const HttpStatus = {
  /**
   * **100 Continue**
   * This interim response indicates that the client should continue the request or ignore the response if the request is already finished.
   */
  CONTINUE: 100,

  /**
   * **101 Switching Protocols**
   * This code is sent in response to an Upgrade request header from the client and indicates the protocol the server is switching to.
   */
  SWITCHING_PROTOCOLS: 101,

  /**
   * **102 Processing** (WebDAV)
   * This code indicates that the server has received and is processing the request, but no response is available yet.
   */
  PROCESSING: 102,

  /**
   * **103 Early Hints**
   * This status code is primarily intended to be used with the Link header, letting the user agent start preloading resources while the server prepares a response.
   */
  EARLY_HINTS: 103,

  /**
   * **200 OK**
   * The request succeeded.
   */
  OK: 200,

  /**
   * **201 Created**
   * The request succeeded, and a new resource was created as a result.
   */
  CREATED: 201,

  /**
   * **202 Accepted**
   * The request has been received but not yet acted upon.
   */
  ACCEPTED: 202,

  /**
   * **204 No Content**
   * There is no content to send for this request, but the headers may be useful.
   */
  NO_CONTENT: 204,

  /**
   * **205 Reset Content**
   * Tells the user agent to reset the document which sent this request.
   */
  RESET_CONTENT: 205,

  /**
   * **206 Partial Content**
   * This response code is used when the Range header is sent from the client to request only part of a resource.
   */
  PARTIAL_CONTENT: 206,

  /**
   * **300 Multiple Choices**
   * The request has more than one possible response. The user agent or user should choose one of them.
   */
  MULTIPLE_CHOICES: 300,

  /**
   * **301 Moved Permanently**
   * The URL of the requested resource has been changed permanently. A new URL is given in the response.
   */
  MOVED_PERMANENTLY: 301,

  /**
   * **302 Found**
   * This response code means that the URI of requested resource has been changed temporarily.
   */
  FOUND: 302,

  /**
   * **303 See Other**
   * The server sent this response to direct the client to get the requested resource at another URI with a GET request.
   */
  SEE_OTHER: 303,

  /**
   * **304 Not Modified**
   * This is used for caching purposes. It tells the client that the response has not been modified, so the client can continue to use the same cached version of the response.
   */
  NOT_MODIFIED: 304,

  /**
   * **307 Temporary Redirect**
   * The server sends this response to direct the client to get the requested resource at another URI with the same method that was used in the prior request.
   */
  TEMPORARY_REDIRECT: 307,

  /**
   * **308 Permanent Redirect**
   * This means that the resource is now permanently located at another URI, specified by the Location HTTP Response header.
   */
  PERMANENT_REDIRECT: 308,

  /**
   * **400 Bad Request**
   * The server cannot or will not process the request due to something that is perceived to be a client error.
   */
  BAD_REQUEST: 400,

  /**
   * **401 Unauthorized**
   * Although the HTTP standard specifies "unauthorized", semantically this response means "unauthenticated". That is, the client must authenticate itself to get the requested response.
   */
  UNAUTHORIZED: 401,

  /**
   * **402 Payment Required**
   * This response code is reserved for future use.
   */
  PAYMENT_REQUIRED: 402,

  /**
   * **403 Forbidden**
   * The client does not have access rights to the content; that is, it is unauthorized, so the server is refusing to give the requested resource.
   */
  FORBIDDEN: 403,

  /**
   * **404 Not Found**
   * The server can not find the requested resource.
   */
  NOT_FOUND: 404,

  /**
   * **405 Method Not Allowed**
   * The request method is known by the server but is not supported by the target resource.
   */
  METHOD_NOT_ALLOWED: 405,

  /**
   * **406 Not Acceptable**
   * This response is sent when the web server, after performing server-driven content negotiation, doesn't find any content that conforms to the criteria given by the user agent.
   */
  NOT_ACCEPTABLE: 406,

  /**
   * **408 Request Timeout**
   * This response is sent on an idle connection by some servers, even without any previous request by the client.
   */
  REQUEST_TIMEOUT: 408,

  /**
   * **409 Conflict**
   * This response is sent when a request conflicts with the current state of the server.
   */
  CONFLICT: 409,

  /**
   * **410 Gone**
   * This response is sent when the requested content has been permanently deleted from server, with no forwarding address.
   */
  GONE: 410,

  /**
   * **411 Length Required**
   * Server rejected the request because the Content-Length header field is not defined and the server requires it.
   */
  LENGTH_REQUIRED: 411,

  /**
   * **412 Precondition Failed**
   * The client has indicated preconditions in its headers which the server does not meet.
   */
  PRECONDITION_FAILED: 412,

  /**
   * **413 Payload Too Large**
   * Request entity is larger than limits defined by server.
   */
  PAYLOAD_TOO_LARGE: 413,

  /**
   * **414 URI Too Long**
   * The URI requested by the client is longer than the server is willing to interpret.
   */
  URI_TOO_LONG: 414,

  /**
   * **415 Unsupported Media Type**
   * The media format of the requested data is not supported by the server, so the server is rejecting the request.
   */
  UNSUPPORTED_MEDIA_TYPE: 415,

  /**
   * **422 Unprocessable Content**
   * The request was well-formed but was unable to be followed due to semantic errors.
   */
  UNPROCESSABLE_CONTENT: 422,

  /**
   * **429 Too Many Requests**
   * The user has sent too many requests in a given amount of time ("rate limiting").
   */
  TOO_MANY_REQUESTS: 429,

  /**
   * **500 Internal Server Error**
   * The server has encountered a situation it doesn't know how to handle.
   */
  INTERNAL_SERVER_ERROR: 500,

  /**
   * **501 Not Implemented**
   * The request method is not supported by the server and cannot be handled.
   */
  NOT_IMPLEMENTED: 501,

  /**
   * **502 Bad Gateway**
   * This error response means that the server, while working as a gateway to get a response needed to handle the request, got an invalid response.
   */
  BAD_GATEWAY: 502,

  /**
   * **503 Service Unavailable**
   * The server is not ready to handle the request. Common causes are a server that is down for maintenance or that is overloaded.
   */
  SERVICE_UNAVAILABLE: 503,

  /**
   * **504 Gateway Timeout**
   * This error response is given when the server is acting as a gateway and cannot get a response in time.
   */
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Represents a union of all known HTTP status code values.
 * It also includes `number` as a fallback for any status codes not explicitly listed.
 */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus] | number;
