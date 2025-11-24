/**
 * @module
 * Modern Cookie utilities with robust parsing and safe serialization.
 *
 * Provides RFC 6265 compliant cookie parsing and serialization with:
 * - Lenient parsing that never throws exceptions
 * - Result-based serialization for safety
 * - TypeScript prefix constraints (__Secure-, __Host-)
 * - 400-day limit enforcement
 * - Zero external dependencies
 */

import { succeed, fail, type KoriResult } from '../util/index.js';

/** Cookie prefix for Secure-only cookies requiring HTTPS */
const SECURE_PREFIX = '__Secure-' as const;

/** Cookie prefix for Host-locked cookies with strict path and domain rules */
const HOST_PREFIX = '__Host-' as const;

/**
 * Structured failure types for cookie operations.
 *
 * Provides type-safe failure handling with detailed contextual information for each
 * failure scenario. Enables precise failure handling without string parsing or guesswork.
 *
 * Each failure type includes a discriminant `type` field for exhaustive switch handling
 * and relevant context data for failure handling.
 */
export type CookieFailure =
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
  /** Partitioned cookie requires SameSite=None */
  | { type: 'PARTITIONED_REQUIRES_SAMESITE_NONE'; message: string }
  /** Cookie serialization error */
  | { type: 'SERIALIZE_ERROR'; original: string; message: string };

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
 * Security Note: For production use, always consider setting `secure: true`,
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
} & SameSiteConstraint &
  PartitionedConstraint;

/**
 * Type-level cookie prefix constraints.
 *
 * Enforces security requirements for prefixed cookies at compile-time according
 * to the Cookie Name Prefixes specification. Provides type safety to prevent
 * runtime security violations.
 *
 * __Secure- Prefix: Requires `secure: true` to ensure HTTPS-only transmission.
 * Prevents downgrade attacks where an insecure connection could set a cookie
 * that overwrites a secure one.
 *
 * __Host- Prefix: Requires `secure: true`, `path: '/'`, and no `domain`
 * attribute. This creates the most restrictive cookie scope, preventing
 * subdomain and path-based cookie injection attacks.
 *
 * Regular Cookies: No additional constraints beyond standard CookieOptions.
 *
 * @template Name - Cookie name literal type for prefix detection
 */
export type CookieConstraint<Name> = Name extends `${typeof SECURE_PREFIX}${string}`
  ? CookieOptions & { secure: true }
  : Name extends `${typeof HOST_PREFIX}${string}`
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
const validCookieValueRegEx = /^[\x20-\x21\x23-\x3A\x3C-\x5B\x5D-\x7E]*$/;

/**
 * Maximum cookie age in seconds (400 days as per RFC 6265bis draft).
 *
 * Enforces the RFC 6265bis recommendation that cookies should not exceed 400 days
 * to prevent excessively long-lived tracking cookies.
 */
const MAX_COOKIE_AGE_SECONDS = 34560000;

/**
 * Safely decodes URI component with graceful failure handling.
 *
 * Provides safe URI decoding for cookie values that may contain invalid
 * percent-encoding sequences. Instead of throwing errors that would
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
 * Malformed cookie pairs are gracefully skipped (lenient) to maximize robustness
 * against real-world HTTP traffic variations. This function never throws.
 *
 * Performance Note: When `targetName` is provided, enables fast-path optimization
 * with early string search and loop termination for significant performance improvement
 * in scenarios with many cookies.
 *
 * Note: Returns a null-prototype object (`Object.create(null)`) to prevent prototype
 * pollution. Do not use methods like `hasOwnProperty` directly on the returned object.
 *
 * @param options - Parsing options
 * @param options.cookieHeader - Raw Cookie header value from HTTP request, may be undefined
 * @param options.targetName - Specific cookie name to extract, enables performance optimization
 * @returns Parsed cookie record (empty object when header is missing or no matches)
 *
 * @example
 * Basic parsing of all cookies:
 * ```typescript
 * const cookies = parseCookies({ cookieHeader: 'sessionId=abc123; theme=dark; userId=42' });
 * console.log(cookies.sessionId); // 'abc123'
 * console.log(cookies.theme);     // 'dark'
 * ```
 *
 * @example
 * Fast-path optimization for single cookie:
 * ```typescript
 * const cookies = parseCookies({
 *   cookieHeader: 'a=1; b=2; sessionId=abc123; c=3; d=4',
 *   targetName: 'sessionId'
 * });
 * // Only parses sessionId, skips others for performance
 * console.log(cookies.sessionId); // 'abc123'
 * ```
 */
export function parseCookies(options: { cookieHeader?: string; targetName?: string } = {}): Record<string, string> {
  const { cookieHeader, targetName } = options;

  if (!cookieHeader) {
    return Object.create(null) as Record<string, string>;
  }

  // Fast-path: return immediately if the target cookie is not in the header
  if (targetName && !cookieHeader.includes(targetName)) {
    return Object.create(null) as Record<string, string>;
  }

  const pairs = cookieHeader.trim().split(';');
  const parsedCookie = Object.create(null) as Record<string, string>;

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

  return parsedCookie;
}

/**
 * Generates a Set-Cookie header value for HTTP responses.
 *
 * Performs RFC 6265 compliant serialization with comprehensive validation including
 * cookie name compliance, prefix constraints, age limits, and security requirements.
 * Automatically applies URI encoding to values and validates all attributes.
 *
 * Type Safety: Enforces prefix constraints at compile-time. `__Secure-` prefixed
 * cookies require `secure: true`, `__Host-` cookies require `secure: true`, `path: '/'`
 * and no domain attribute.
 *
 * RFC 6265bis Compliance: Enforces 400-day maximum age limit for both MaxAge
 * and Expires attributes to prevent excessively long-lived cookies.
 *
 * Security Validation: Validates Partitioned cookies require Secure attribute
 * and ensures all cookie names contain only RFC 6265 compliant characters.
 *
 * @template Name - Cookie name type for compile-time prefix constraint enforcement
 * @param name - Cookie name, must be RFC 6265 compliant token
 * @param value - Cookie value, will be automatically URI encoded
 * @param options - Cookie attributes with type-safe prefix constraints
 * @returns Result containing Set-Cookie header string or structured failure details
 *
 * @example
 * Basic cookie creation:
 * ```typescript
 * const result = serializeCookie('sessionId', 'abc123');
 * if (result.success) {
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
 * Failure handling with detailed information:
 * ```typescript
 * const result = serializeCookie('__Secure-test', 'value', {});
 * if (!result.success) {
 *   switch (result.reason.type) {
 *     case 'PREFIX_VIOLATION':
 *       console.log(`Prefix: ${result.reason.prefix}`);
 *       console.log(`Required: ${result.reason.required}`);
 *       break;
 *     case 'AGE_LIMIT_EXCEEDED':
 *       console.log(`Limit: ${result.reason.limit} seconds`);
 *       break;
 *   }
 * }
 * ```
 */
export function serializeCookie<Name extends string>(
  name: Name,
  value: string,
  options?: CookieConstraint<Name>,
): KoriResult<string, CookieFailure> {
  const opt: Partial<CookieOptions> = options ?? {};
  const sameSiteLower = typeof opt.sameSite === 'string' ? opt.sameSite.toLowerCase() : undefined;
  // Validate cookie name
  if (!name) {
    return fail({
      type: 'INVALID_NAME',
      name,
      message: 'Cookie name cannot be empty',
    });
  }

  if (!validCookieNameRegEx.test(name)) {
    return fail({
      type: 'INVALID_NAME',
      name,
      message: `Invalid cookie name: "${name}". Must contain only RFC 6265 compliant characters.`,
    });
  }

  // Validate prefix constraints
  if (name.startsWith(SECURE_PREFIX) && !opt.secure) {
    return fail({
      type: 'PREFIX_VIOLATION',
      prefix: SECURE_PREFIX,
      required: 'secure: true',
      message: `${SECURE_PREFIX} cookies must have secure: true`,
    });
  }

  if (name.startsWith(HOST_PREFIX)) {
    if (!opt.secure) {
      return fail({
        type: 'PREFIX_VIOLATION',
        prefix: HOST_PREFIX,
        required: 'secure: true',
        message: `${HOST_PREFIX} cookies must have secure: true`,
      });
    }
    if (opt.path !== '/') {
      return fail({
        type: 'PREFIX_VIOLATION',
        prefix: HOST_PREFIX,
        required: 'path: "/"',
        message: `${HOST_PREFIX} cookies must have path: "/"`,
      });
    }
    if (opt.domain) {
      return fail({
        type: 'PREFIX_VIOLATION',
        prefix: HOST_PREFIX,
        required: 'no domain attribute',
        message: `${HOST_PREFIX} cookies must not have domain attribute`,
      });
    }
  }

  // Validate age limits (RFC 6265bis draft)
  const maxAge = opt.maxAge;
  if (typeof maxAge === 'number' && maxAge >= 0 && maxAge > MAX_COOKIE_AGE_SECONDS) {
    return fail({
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
      return fail({
        type: 'EXPIRES_LIMIT_EXCEEDED',
        futureTime: Math.floor(futureTime / 1000),
        limit: MAX_COOKIE_AGE_SECONDS,
        message: 'Expires should not be more than 400 days in the future',
      });
    }
  }

  // Validate partitioned constraint
  if (opt.partitioned && !opt.secure) {
    return fail({
      type: 'PARTITIONED_REQUIRES_SECURE',
      message: 'Partitioned cookies must have secure: true',
    });
  }

  // Validate SameSite=None requires Secure
  if (sameSiteLower === 'none' && !opt.secure) {
    return fail({
      type: 'SAMESITE_NONE_REQUIRES_SECURE',
      message: 'SameSite=None cookies must have secure: true',
    });
  }

  // Validate Partitioned requires SameSite=None
  if (opt.partitioned && sameSiteLower !== 'none') {
    return fail({
      type: 'PARTITIONED_REQUIRES_SAMESITE_NONE',
      message: 'Partitioned cookies must set SameSite=None',
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

    if (sameSiteLower) {
      const sameSiteCap = sameSiteLower.charAt(0).toUpperCase() + sameSiteLower.slice(1);
      cookie += `; SameSite=${sameSiteCap}`;
    }

    if (opt.partitioned) {
      cookie += '; Partitioned';
    }

    return succeed(cookie);
  } catch (error) {
    return fail({
      type: 'SERIALIZE_ERROR',
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
 * Critical Security Note: Cookie deletion only succeeds when path and domain
 * attributes exactly match the original cookie. Browsers use path/domain for
 * cookie isolation, so mismatched attributes create a new cookie instead of
 * deleting the existing one.
 *
 * Implementation Detail: Internally delegates to serializeCookie with
 * deletion-specific attributes, inheriting all validation and failure handling.
 *
 * @param name - Cookie name to delete, must be RFC 6265 compliant token
 * @param options - Scope attributes that must match original cookie exactly
 * @returns Result containing Set-Cookie deletion header or structured failure details
 *
 * @example
 * Delete a basic session cookie:
 * ```typescript
 * const result = deleteCookie('sessionId');
 * if (result.success) {
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
 * if (deleteResult.success) {
 *   response.setHeader('Set-Cookie', deleteResult.value);
 *   // -> 'userPrefs=; Max-Age=0; Domain=.example.com; Path=/admin; Expires=...'
 * }
 * ```
 *
 * @example
 * Handle deletion failures:
 * ```typescript
 * const result = deleteCookie('invalid name!');
 * if (!result.success) {
 *   switch (result.reason.type) {
 *     case 'INVALID_NAME':
 *       console.log('Invalid cookie name:', result.reason.name);
 *       break;
 *   }
 * }
 * ```
 */
export function deleteCookie(
  name: string,
  options: Pick<CookieOptions, 'path' | 'domain'> = {},
): KoriResult<string, CookieFailure> {
  const base: CookieOptions = {
    expires: new Date(0),
    maxAge: 0,
    path: options.path,
    domain: options.domain,
  };

  if (name.startsWith(HOST_PREFIX)) {
    // __Host- deletion must satisfy prefix rules
    return serializeCookie(name, '', { ...base, secure: true, path: '/', domain: undefined });
  }

  if (name.startsWith(SECURE_PREFIX)) {
    // __Secure- deletion must be secure
    return serializeCookie(name, '', { ...base, secure: true });
  }

  return serializeCookie(name, '', base);
}
