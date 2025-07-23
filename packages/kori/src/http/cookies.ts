/**
 * Cookie utilities for parsing and serializing cookies
 */

export type CookieValue = string;

export type CookieOptions = {
  /**
   * Cookie expiration date
   */
  expires?: Date;
  /**
   * Cookie max age in seconds
   */
  maxAge?: number;
  /**
   * Domain where the cookie is valid
   */
  domain?: string;
  /**
   * Path where the cookie is valid
   */
  path?: string;
  /**
   * Send cookie only over HTTPS connections
   */
  secure?: boolean;
  /**
   * Prevent JavaScript access to the cookie
   */
  httpOnly?: boolean;
  /**
   * SameSite attribute for CSRF protection
   */
  sameSite?: 'strict' | 'lax' | 'none';
};

export type Cookie = {
  name: string;
  value: CookieValue;
  options?: CookieOptions;
};

/**
 * Parse Cookie header and return Record<string, string>
 *
 * @param cookieHeader - Cookie header value
 * @returns Parsed cookies
 */
export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  const cookies: Record<string, string> = {};

  // Parse Cookie: name1=value1; name2=value2; name3=value3 format
  const pairs = cookieHeader.split(';');

  for (const pair of pairs) {
    const trimmedPair = pair.trim();
    if (!trimmedPair) {
      continue;
    }

    const eqIndex = trimmedPair.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }

    const name = trimmedPair.slice(0, eqIndex).trim();
    const value = trimmedPair.slice(eqIndex + 1).trim();

    if (name) {
      try {
        cookies[name] = decodeURIComponent(value);
      } catch (error) {
        // If decoding fails (URIError for malformed encoding), use the raw value
        if (error instanceof URIError) {
          cookies[name] = value;
        } else {
          // Re-throw unexpected errors
          throw error;
        }
      }
    }
  }

  return cookies;
}

/**
 * Validates a cookie name according to RFC 6265.
 * Cookie names must contain only valid token characters.
 */
function validateCookieName(name: string): void {
  if (!name) {
    throw new Error('Cookie name cannot be empty');
  }

  // RFC 6265 token characters: ALPHA / DIGIT / "-" / "." / "_" / "~" / "!" / "#" / "$" / "&" / "'" / "*" / "+" / "^" / "`" / "|"
  if (!/^[a-zA-Z0-9\-._~!#$&'*+^`|]+$/.test(name)) {
    throw new Error(
      `Invalid cookie name: "${name}". Cookie names must contain only RFC 6265 compliant characters (letters, numbers, and: - . _ ~ ! # $ & ' * + ^ \` |).`,
    );
  }
}

/**
 * Generate Set-Cookie header value
 *
 * Note: If encoding fails, this function falls back to using the raw value
 * without logging. For debug logging of encoding failures, handle logging
 * in the calling code.
 *
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 * @returns Set-Cookie header value
 */
export function serializeCookie(name: string, value: CookieValue, options: CookieOptions = {}): string {
  validateCookieName(name);
  let encodedValue: string;
  try {
    encodedValue = encodeURIComponent(value);
  } catch (error) {
    // If encoding fails (URIError for malformed values), use the raw value
    if (error instanceof URIError) {
      encodedValue = value;
    } else {
      // Re-throw unexpected errors
      throw error;
    }
  }
  let cookie = `${name}=${encodedValue}`;

  if (options.expires) {
    cookie += `; expires=${options.expires.toUTCString()}`;
  }

  if (options.maxAge !== undefined) {
    cookie += `; max-age=${options.maxAge}`;
  }

  if (options.domain) {
    cookie += `; domain=${options.domain}`;
  }

  if (options.path) {
    cookie += `; path=${options.path}`;
  }

  if (options.secure) {
    cookie += '; secure';
  }

  if (options.httpOnly) {
    cookie += '; httponly';
  }

  if (options.sameSite) {
    cookie += `; samesite=${options.sameSite}`;
  }

  return cookie;
}

/**
 * Generate Set-Cookie header value for deleting a cookie
 *
 * @param name - Cookie name
 * @param options - Cookie options (only path and domain are valid)
 * @returns Set-Cookie header value for deletion
 */
export function deleteCookie(name: string, options: Pick<CookieOptions, 'path' | 'domain'> = {}): string {
  validateCookieName(name);
  return serializeCookie(name, '', {
    ...options,
    expires: new Date(0),
    maxAge: 0,
  });
}
