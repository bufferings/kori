/**
 * Decodes a query parameter value by converting plus signs to spaces
 * and applying percent decoding.
 *
 * Handles malformed percent encoding gracefully by returning the original
 * value if decoding fails.
 *
 * @param value - Raw query parameter value to decode
 * @returns Decoded value with plus signs as spaces and percent sequences decoded
 *
 * @internal
 */
export function decodeQueryValue(value: string): string {
  if (!/[%+]/.test(value)) {
    return value;
  }

  // eslint-disable-next-line @typescript-eslint/prefer-includes
  if (value.indexOf('+') !== -1) {
    value = value.replace(/\+/g, ' ');
  }

  // eslint-disable-next-line @typescript-eslint/prefer-includes
  if (value.indexOf('%') !== -1) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return value;
}

function parseQueryParamInternal({
  url,
  name,
  wantArray,
}: {
  url: string;
  name: string;
  wantArray: boolean;
}): string | string[] | undefined {
  const values: string[] = [];

  // Start search after protocol (http:// = 7, https:// = 8)
  let keyIndex = url.indexOf(`?${name}`, 8);
  if (keyIndex === -1) {
    keyIndex = url.indexOf(`&${name}`, 8);
  }

  while (keyIndex !== -1) {
    const trailingKeyCode = url.charCodeAt(keyIndex + name.length + 1);
    if (trailingKeyCode === 61) {
      // '='
      const valueIndex = keyIndex + name.length + 2;
      const endIndex = url.indexOf('&', valueIndex);
      const value = url.slice(valueIndex, endIndex === -1 ? undefined : endIndex);
      const decoded = decodeQueryValue(value);

      if (!wantArray) {
        return decoded;
      }
      values.push(decoded);
    } else if (trailingKeyCode === 38 || isNaN(trailingKeyCode)) {
      // '&' or end of string
      if (!wantArray) {
        return '';
      }
      values.push('');
    }
    keyIndex = url.indexOf(`&${name}`, keyIndex + 1);
  }

  if (!wantArray) {
    return undefined;
  }
  return values.length > 0 ? values : undefined;
}

/**
 * Extracts the first value of a query parameter from a URL string.
 *
 * Parses the URL string directly without creating a URLSearchParams object
 * for performance. Returns the decoded value if found, or undefined if the
 * parameter does not exist.
 *
 * @param url - Full URL string to parse
 * @param name - Query parameter name to extract
 * @returns Decoded parameter value or undefined if not found
 *
 * @internal
 */
export function parseQueryParam(url: string, name: string): string | undefined {
  return parseQueryParamInternal({ url, name, wantArray: false }) as string | undefined;
}

/**
 * Extracts all values of a query parameter from a URL string as an array.
 *
 * Returns an array containing all occurrences of the parameter. If the
 * parameter appears once, returns a single-element array. If the parameter
 * does not exist, returns undefined.
 *
 * @internal
 *
 * @param url - Full URL string to parse
 * @param name - Query parameter name to extract
 * @returns Array of decoded parameter values or undefined if not found
 */
export function parseQueryParamArray(url: string, name: string): string[] | undefined {
  return parseQueryParamInternal({ url, name, wantArray: true }) as string[] | undefined;
}

/**
 * Parses all query parameters from a URL string into a record.
 *
 * Single-valued parameters are returned as strings, while parameters that
 * appear multiple times are returned as arrays. Parses the URL string
 * directly without creating a URLSearchParams object for performance.
 *
 * @param url - Full URL string to parse
 * @returns Record mapping parameter names to their values (string or string array)
 *
 * @internal
 */
export function parseAllQueryParams(url: string): Record<string, string | string[]> {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) {
    return {};
  }

  const result: Record<string, string[]> = {};
  const queryString = url.slice(queryStart + 1);

  if (!queryString) {
    return {};
  }

  const pairs = queryString.split('&');
  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');

    if (eqIndex === -1) {
      const key = pair;
      if (key) {
        result[key] ??= [];
        result[key].push('');
      }
    } else {
      const key = pair.slice(0, eqIndex);
      const value = pair.slice(eqIndex + 1);
      if (key) {
        result[key] ??= [];
        result[key].push(decodeQueryValue(value));
      }
    }
  }

  const finalResult: Record<string, string | string[]> = {};
  for (const key in result) {
    const values = result[key];
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    finalResult[key] = values!.length === 1 ? values![0]! : values!;
  }

  return finalResult;
}
