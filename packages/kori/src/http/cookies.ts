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
      } catch {
        // If decoding fails, use the raw value
        cookies[name] = value;
      }
    }
  }

  return cookies;
}

/**
 * Generate Set-Cookie header value
 *
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 * @returns Set-Cookie header value
 */
export function serializeCookie(name: string, value: CookieValue, options: CookieOptions = {}): string {
  let encodedValue: string;
  try {
    encodedValue = encodeURIComponent(value);
  } catch {
    // If encoding fails, use the raw value
    encodedValue = value;
  }
  let cookie = `${name}=${encodedValue}`;

  if (options.expires) {
    cookie += `; Expires=${options.expires.toUTCString()}`;
  }

  if (options.maxAge !== undefined) {
    cookie += `; Max-Age=${options.maxAge}`;
  }

  if (options.domain) {
    cookie += `; Domain=${options.domain}`;
  }

  if (options.path) {
    cookie += `; Path=${options.path}`;
  }

  if (options.secure) {
    cookie += '; Secure';
  }

  if (options.httpOnly) {
    cookie += '; HttpOnly';
  }

  if (options.sameSite) {
    const sameSiteValue = options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1);
    cookie += `; SameSite=${sameSiteValue}`;
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
  return serializeCookie(name, '', {
    ...options,
    expires: new Date(0),
    maxAge: 0,
  });
}
