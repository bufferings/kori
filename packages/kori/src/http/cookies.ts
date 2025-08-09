/**
 * @module
 * Modern Cookie utilities with Result-based error handling.
 *
 * Provides RFC 6265 compliant cookie parsing and serialization with:
 * - Result-based error handling for safety
 * - TypeScript prefix constraints (__Secure-, __Host-)
 * - 400-day limit enforcement
 * - Zero external dependencies
 */

import { type KoriResult, ok, err } from '../util/index.js';

/**
 * Parsed cookie data structure.
 *
 * Maps cookie names to their decoded string values. All values are automatically
 * URI-decoded during parsing for immediate use in application logic.
 */
export type Cookie = Record<string, string>;

/**
 * Structured error types for cookie operations.
 *
 * Provides type-safe error handling with detailed contextual information for each
 * error scenario. Enables precise error handling without string parsing or guesswork.
 *
 * Each error type includes a discriminant `type` field for exhaustive switch handling
 * and relevant context data for debugging and error reporting.
 */
export type CookieError =
  /** Cookie name validation failure */
  | { type: 'INVALID_NAME'; name: string; message: string }
  /** Cookie prefix security constraint violation */
  | { type: 'PREFIX_VIOLATION'; prefix: string; required: string; message: string }
  /** MaxAge exceeds RFC 6265bis 400-day limit */
  | { type: 'AGE_LIMIT_EXCEEDED'; maxAge: number; limit: number; message: string }
  /** Expires date exceeds RFC 6265bis 400-day limit */
  | { type: 'EXPIRES_LIMIT_EXCEEDED'; futureTime: number; limit: number; message: string }
  /** Partitioned cookie missing required Secure attribute */
  | { type: 'PARTITIONED_REQUIRES_SECURE'; message: string }
  /** SameSite=None requires Secure attribute */
  | { type: 'SAMESITE_NONE_REQUIRES_SECURE'; message: string }
  /** Cookie header parsing or serialization failure */
  | { type: 'PARSE_ERROR'; original: string; message: string };

type SameSiteValue = 'Strict' | 'Lax' | 'None' | 'strict' | 'lax' | 'none';

/**
 * SameSite=None requires Secure=true at the type level.
 */
type SameSiteConstraint =
  | { sameSite?: Exclude<SameSiteValue, 'None' | 'none'>; secure?: boolean }
  | { sameSite: 'None' | 'none'; secure: true };

/**
 * Partitioned cookies require Secure=true at the type level.
 */
type PartitionedConstraint =
  | { partitioned?: false | undefined; secure?: boolean }
  | { partitioned: true; secure: true };

/**
 * Configuration options for cookie attributes.
 *
 * Defines all supported cookie attributes according to RFC 6265 and modern
 * browser extensions. All attributes are optional and have sensible defaults.
 *
 * **Security Note**: For production use, always consider setting `secure: true`,
 * `httpOnly: true`, and appropriate `sameSite` values to prevent common
 * cookie-based attacks.
 */
export type CookieOptions = {
  /** Absolute expiration date, max 400 days in future per RFC 6265bis */
  expires?: Date;
  /** Max age in seconds, max 34560000 (400 days) per RFC 6265bis */
  maxAge?: number;
  /** Domain scope, controls which hosts receive the cookie */
  domain?: string;
  /** Path scope, controls which URL paths receive the cookie */
  path?: string;
  /** Prevent JavaScript access via document.cookie */
  httpOnly?: boolean;
  /** Priority hint for cookie eviction (Chrome extension) */
  priority?: 'Low' | 'Medium' | 'High' | 'low' | 'medium' | 'high';
} & SameSiteConstraint &
  PartitionedConstraint;

/**
 * Type-level cookie prefix constraints.
 *
 * Enforces security requirements for prefixed cookies at compile-time according
 * to the Cookie Name Prefixes specification. Provides type safety to prevent
 * runtime security violations.
 *
 * **__Secure- Prefix**: Requires `secure: true` to ensure HTTPS-only transmission.
 * Prevents downgrade attacks where an insecure connection could set a cookie
 * that overwrites a secure one.
 *
 * **__Host- Prefix**: Requires `secure: true`, `path: '/'`, and no `domain`
 * attribute. This creates the most restrictive cookie scope, preventing
 * subdomain and path-based cookie injection attacks.
 *
 * **Regular Cookies**: No additional constraints beyond standard CookieOptions.
 *
 * @template Name - Cookie name literal type for prefix detection
 */
export type CookieConstraint<Name> = Name extends `__Secure-${string}`
  ? CookieOptions & { secure: true }
  : Name extends `__Host-${string}`
    ? CookieOptions & { secure: true; path: '/'; domain?: never }
    : CookieOptions;

/**
 * RFC 6265 compliant cookie name validation regex.
 *
 * Allows alphanumeric characters and specific symbols: ! # $ % & ' * + - . ^ _ ` | ~
 * Rejects control characters, whitespace, and cookie-delimiter characters.
 */
const validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;

/**
 * RFC 6265 compliant cookie value validation regex.
 *
 * Allows ASCII characters 32-126 except: " ; \ (double quote, semicolon, backslash)
 * Intentionally permits comma and space despite RFC restrictions due to real-world usage.
 */
const validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;

/**
 * Maximum cookie age in seconds (400 days as per RFC 6265bis draft).
 *
 * Enforces the RFC 6265bis recommendation that cookies should not exceed 400 days
 * to prevent excessively long-lived tracking cookies.
 */
const MAX_COOKIE_AGE_SECONDS = 34560000;

/**
 * Safely decodes URI component with graceful error handling.
 *
 * Provides safe URI decoding for cookie values that may contain invalid
 * percent-encoding sequences. Instead of throwing exceptions that would
 * break cookie parsing, returns the original value when decoding fails.
 *
 * @param value - URI-encoded string to decode
 * @returns Decoded string, or original value if decoding fails
 */
function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value; // Return original value if decoding fails
  }
}

/**
 * Parses HTTP Cookie header value into a record of cookie names and values.
 *
 * Performs RFC 6265 compliant parsing with proper URI decoding and validation.
 * Handles malformed cookies gracefully by skipping invalid entries rather than
 * failing the entire operation.
 *
 * **Performance Note**: When `targetName` is provided, enables fast-path optimization
 * with early string search and loop termination for significant performance improvement
 * in scenarios with many cookies.
 *
 * **Error Handling**: Malformed cookie pairs are silently skipped to maintain
 * robustness against real-world HTTP traffic variations.
 *
 * @param cookieHeader - Raw Cookie header value from HTTP request, may be undefined
 * @param targetName - Specific cookie name to extract, enables performance optimization
 * @returns Result containing either parsed cookie record or structured error details
 *
 * @example
 * Basic parsing of all cookies:
 * ```typescript
 * const result = parseCookies('sessionId=abc123; theme=dark; userId=42');
 * if (result.ok) {
 *   console.log(result.value.sessionId); // 'abc123'
 *   console.log(result.value.theme);     // 'dark'
 * }
 * ```
 *
 * @example
 * Fast-path optimization for single cookie:
 * ```typescript
 * const result = parseCookies(
 *   'a=1; b=2; sessionId=abc123; c=3; d=4',
 *   'sessionId'
 * );
 * // Only parses sessionId, skips others for performance
 * if (result.ok) {
 *   console.log(result.value.sessionId); // 'abc123'
 * }
 * ```
 *
 * @example
 * Error handling with structured errors:
 * ```typescript
 * const result = parseCookies('malformed;;;cookie=header');
 * if (!result.ok) {
 *   switch (result.error.type) {
 *     case 'PARSE_ERROR':
 *       console.log('Original:', result.error.original);
 *       break;
 *   }
 * }
 * ```
 */
export function parseCookies(cookieHeader?: string, targetName?: string): KoriResult<Cookie, CookieError> {
  if (!cookieHeader) {
    return ok({});
  }

  // Fast-path: return immediately if the target cookie is not in the header
  if (targetName && !cookieHeader.includes(targetName)) {
    return ok({});
  }

  try {
    const pairs = cookieHeader.trim().split(';');
    const parsedCookie: Cookie = {};

    for (let pairStr of pairs) {
      pairStr = pairStr.trim();
      const valueStartPos = pairStr.indexOf('=');

      if (valueStartPos === -1) {
        continue; // Skip malformed pairs
      }

      const cookieName = pairStr.substring(0, valueStartPos).trim();
      if (!validCookieNameRegEx.test(cookieName)) {
        continue; // Skip invalid names
      }

      // Fast-path: if looking for specific cookie name, skip others
      if (targetName && targetName !== cookieName) {
        continue;
      }

      let cookieValue = pairStr.substring(valueStartPos + 1).trim();

      // Remove surrounding quotes if present
      if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
        cookieValue = cookieValue.slice(1, -1);
      }

      if (validCookieValueRegEx.test(cookieValue)) {
        // Safely decode URI component if needed
        parsedCookie[cookieName] = cookieValue.includes('%') ? safeDecodeURIComponent(cookieValue) : cookieValue;

        // Fast-path: if found target cookie, break early
        if (targetName && cookieName === targetName) {
          break;
        }
      }
    }

    return ok(parsedCookie);
  } catch (error) {
    return err({
      type: 'PARSE_ERROR',
      original: cookieHeader,
      message: `Failed to parse cookie header: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Generates a Set-Cookie header value for HTTP responses.
 *
 * Performs RFC 6265 compliant serialization with comprehensive validation including
 * cookie name compliance, prefix constraints, age limits, and security requirements.
 * Automatically applies URI encoding to values and validates all attributes.
 *
 * **Type Safety**: Enforces prefix constraints at compile-time. `__Secure-` prefixed
 * cookies require `secure: true`, `__Host-` cookies require `secure: true`, `path: '/'`
 * and no domain attribute.
 *
 * **RFC 6265bis Compliance**: Enforces 400-day maximum age limit for both MaxAge
 * and Expires attributes to prevent excessively long-lived cookies.
 *
 * **Security Validation**: Validates Partitioned cookies require Secure attribute
 * and ensures all cookie names contain only RFC 6265 compliant characters.
 *
 * @template Name - Cookie name type for compile-time prefix constraint enforcement
 * @param name - Cookie name, must be RFC 6265 compliant token
 * @param value - Cookie value, will be automatically URI encoded
 * @param options - Cookie attributes with type-safe prefix constraints
 * @returns Result containing Set-Cookie header string or structured error details
 *
 * @example
 * Basic cookie creation:
 * ```typescript
 * const result = serializeCookie('sessionId', 'abc123');
 * if (result.ok) {
 *   response.setHeader('Set-Cookie', result.value);
 *   // -> 'sessionId=abc123'
 * }
 * ```
 *
 * @example
 * Type-safe __Secure- prefix validation:
 * ```typescript
 * // Valid: Compiles - secure: true provided
 * const secure = serializeCookie('__Secure-token', 'secret', {
 *   secure: true,
 *   httpOnly: true,
 *   sameSite: 'strict'
 * });
 *
 * // Error: TypeScript error - secure: true required for __Secure-
 * const invalid = serializeCookie('__Secure-token', 'secret', {
 *   httpOnly: true  // Missing secure: true
 * });
 * ```
 *
 * @example
 * Type-safe __Host- prefix validation:
 * ```typescript
 * const host = serializeCookie('__Host-session', 'value', {
 *   secure: true,  // Required
 *   path: '/',     // Required
 *   httpOnly: true
 *   // domain not allowed for __Host- cookies
 * });
 * ```
 *
 * @example
 * Error handling with detailed information:
 * ```typescript
 * const result = serializeCookie('__Secure-test', 'value', {});
 * if (!result.ok) {
 *   switch (result.error.type) {
 *     case 'PREFIX_VIOLATION':
 *       console.log(`Prefix: ${result.error.prefix}`);
 *       console.log(`Required: ${result.error.required}`);
 *       break;
 *     case 'AGE_LIMIT_EXCEEDED':
 *       console.log(`Limit: ${result.error.limit} seconds`);
 *       break;
 *   }
 * }
 * ```
 */
export function serializeCookie<Name extends string>(
  name: Name,
  value: string,
  options?: CookieConstraint<Name>,
): KoriResult<string, CookieError> {
  const opt: Partial<CookieOptions> = options ?? {};
  // Validate cookie name
  if (!name) {
    return err({
      type: 'INVALID_NAME',
      name,
      message: 'Cookie name cannot be empty',
    });
  }

  if (!validCookieNameRegEx.test(name)) {
    return err({
      type: 'INVALID_NAME',
      name,
      message: `Invalid cookie name: "${name}". Must contain only RFC 6265 compliant characters.`,
    });
  }

  // Validate prefix constraints
  if (name.startsWith('__Secure-') && !opt.secure) {
    return err({
      type: 'PREFIX_VIOLATION',
      prefix: '__Secure-',
      required: 'secure: true',
      message: '__Secure- cookies must have secure: true',
    });
  }

  if (name.startsWith('__Host-')) {
    if (!opt.secure) {
      return err({
        type: 'PREFIX_VIOLATION',
        prefix: '__Host-',
        required: 'secure: true',
        message: '__Host- cookies must have secure: true',
      });
    }
    if (opt.path !== '/') {
      return err({
        type: 'PREFIX_VIOLATION',
        prefix: '__Host-',
        required: 'path: "/"',
        message: '__Host- cookies must have path: "/"',
      });
    }
    if (opt.domain) {
      return err({
        type: 'PREFIX_VIOLATION',
        prefix: '__Host-',
        required: 'no domain attribute',
        message: '__Host- cookies must not have domain attribute',
      });
    }
  }

  // Validate age limits (RFC 6265bis draft)
  const maxAge = opt.maxAge;
  if (typeof maxAge === 'number' && maxAge >= 0 && maxAge > MAX_COOKIE_AGE_SECONDS) {
    return err({
      type: 'AGE_LIMIT_EXCEEDED',
      maxAge,
      limit: MAX_COOKIE_AGE_SECONDS,
      message: `Max-Age should not exceed 400 days (${MAX_COOKIE_AGE_SECONDS} seconds)`,
    });
  }

  const expires = opt.expires;
  if (expires) {
    const futureTime = expires.getTime() - Date.now();
    if (futureTime > MAX_COOKIE_AGE_SECONDS * 1000) {
      return err({
        type: 'EXPIRES_LIMIT_EXCEEDED',
        futureTime: Math.floor(futureTime / 1000),
        limit: MAX_COOKIE_AGE_SECONDS,
        message: 'Expires should not be more than 400 days in the future',
      });
    }
  }

  // Validate partitioned constraint
  if (opt.partitioned && !opt.secure) {
    return err({
      type: 'PARTITIONED_REQUIRES_SECURE',
      message: 'Partitioned cookies must have secure: true',
    });
  }

  // Validate SameSite=None requires Secure
  if (opt.sameSite && (opt.sameSite === 'none' || opt.sameSite === 'None') && !opt.secure) {
    return err({
      type: 'SAMESITE_NONE_REQUIRES_SECURE',
      message: 'SameSite=None cookies must have secure: true',
    });
  }

  try {
    // Encode cookie value
    const encodedValue = encodeURIComponent(value);
    let cookie = `${name}=${encodedValue}`;

    // Add attributes
    if (typeof maxAge === 'number' && maxAge >= 0) {
      cookie += `; Max-Age=${Math.floor(maxAge)}`;
    }

    if (opt.domain) {
      cookie += `; Domain=${opt.domain}`;
    }

    if (opt.path) {
      cookie += `; Path=${opt.path}`;
    }

    if (expires) {
      cookie += `; Expires=${expires.toUTCString()}`;
    }

    if (opt.httpOnly) {
      cookie += '; HttpOnly';
    }

    if (opt.secure) {
      cookie += '; Secure';
    }

    if (opt.sameSite) {
      const sameSite = opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1);
      cookie += `; SameSite=${sameSite}`;
    }

    if (opt.priority) {
      const priority = opt.priority.charAt(0).toUpperCase() + opt.priority.slice(1);
      cookie += `; Priority=${priority}`;
    }

    if (opt.partitioned) {
      cookie += '; Partitioned';
    }

    return ok(cookie);
  } catch (error) {
    return err({
      type: 'PARSE_ERROR',
      original: `${name}=${value}`,
      message: `Failed to serialize cookie: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Generates a Set-Cookie header value to delete an existing cookie.
 *
 * Creates a deletion instruction by setting the cookie value to empty string,
 * expires date to Unix epoch (January 1, 1970), and maxAge to 0. This signals
 * the browser to immediately remove the cookie from its storage.
 *
 * **Critical Security Note**: Cookie deletion only succeeds when path and domain
 * attributes exactly match the original cookie. Browsers use path/domain for
 * cookie isolation, so mismatched attributes create a new cookie instead of
 * deleting the existing one.
 *
 * **Implementation Detail**: Internally delegates to serializeCookie with
 * deletion-specific attributes, inheriting all validation and error handling.
 *
 * @param name - Cookie name to delete, must be RFC 6265 compliant token
 * @param options - Scope attributes that must match original cookie exactly
 * @returns Result containing Set-Cookie deletion header or structured error details
 *
 * @example
 * Delete a basic session cookie:
 * ```typescript
 * const result = deleteCookie('sessionId');
 * if (result.ok) {
 *   response.setHeader('Set-Cookie', result.value);
 *   // -> 'sessionId=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
 * }
 * ```
 *
 * @example
 * Delete scoped cookie with exact path/domain match:
 * ```typescript
 * // Original cookie was set with these exact attributes
 * const deleteResult = deleteCookie('userPrefs', {
 *   path: '/admin',
 *   domain: '.example.com'
 * });
 *
 * if (deleteResult.ok) {
 *   response.setHeader('Set-Cookie', deleteResult.value);
 *   // -> 'userPrefs=; Max-Age=0; Domain=.example.com; Path=/admin; Expires=...'
 * }
 * ```
 *
 * @example
 * Handle deletion errors:
 * ```typescript
 * const result = deleteCookie('invalid name!');
 * if (!result.ok) {
 *   switch (result.error.type) {
 *     case 'INVALID_NAME':
 *       console.log('Invalid cookie name:', result.error.name);
 *       break;
 *   }
 * }
 * ```
 */
export function deleteCookie(
  name: string,
  options: Pick<CookieOptions, 'path' | 'domain'> = {},
): KoriResult<string, CookieError> {
  return serializeCookie(name, '', {
    ...options,
    expires: new Date(0),
    maxAge: 0,
  } as CookieConstraint<typeof name>);
}
