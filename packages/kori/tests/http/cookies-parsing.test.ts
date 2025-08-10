import { describe, expect, test } from 'vitest';

import { parseCookies } from '../../src/http/cookies.js';

describe('parseCookies', () => {
  test('should parse simple cookie', () => {
    const result = parseCookies('session_id=abc123');
    expect(result).toEqual({ session_id: 'abc123' });
  });

  test('should parse multiple cookies', () => {
    const result = parseCookies('session_id=abc123; username=john; theme=dark');
    expect(result).toEqual({
      session_id: 'abc123',
      username: 'john',
      theme: 'dark',
    });
  });

  test('should handle URL encoded values', () => {
    const result = parseCookies('message=hello%20world; name=john%40example.com');
    expect(result).toEqual({
      message: 'hello world',
      name: 'john@example.com',
    });
  });

  // TODO: Implement quoted-string support (RFC 6265)
  // test('should handle quoted values (RFC 6265 compliant)', () => {
  //   // Properly quoted values with spaces
  //   const result1 = parseCookies('message="hello world"; name="john doe"');
  //   expect(result1).toEqual({ message: 'hello world', name: 'john doe' });

  //   // Quoted values with special characters
  //   const result2 = parseCookies('data="value; with=special"; id=123');
  //   expect(result2).toEqual({ data: 'value; with=special', id: '123' });

  //   // Empty quoted values
  //   const result3 = parseCookies('empty=""; nonempty="test"');
  //   expect(result3).toEqual({ empty: '', nonempty: 'test' });
  // });

  test('should handle unquoted values with spaces gracefully (lenient RFC 6265)', () => {
    // RFC 6265 technically requires quotes for values with spaces: name="hello world"
    // But we accept unquoted values for browser compatibility and practical usage

    // Values with spaces (unencoded, RFC violation but common)
    const result1 = parseCookies('name=hello world');
    expect(result1).toEqual({ name: 'hello world' });

    // Multiple cookies with spaced values
    const result2 = parseCookies('session=abc def; user=john doe; id=123');
    expect(result2).toEqual({ session: 'abc def', user: 'john doe', id: '123' });

    // Mixed encoded and unencoded spaces
    const result3 = parseCookies('encoded=hello%20world; unencoded=hello world');
    expect(result3).toEqual({ encoded: 'hello world', unencoded: 'hello world' });
  });

  test('should handle empty cookie header', () => {
    const result1 = parseCookies('');
    expect(result1).toEqual({});

    const result2 = parseCookies(undefined);
    expect(result2).toEqual({});
  });

  test('should handle malformed cookie formats gracefully', () => {
    // Cookie without value
    const result1 = parseCookies('session_id=; username=john');
    expect(result1).toEqual({ session_id: '', username: 'john' });

    // Cookie without equals sign
    const result2 = parseCookies('session_id; username=john');
    expect(result2).toEqual({ username: 'john' });

    // Extra spaces
    const result3 = parseCookies('  session_id = abc123  ;  username = john  ');
    expect(result3).toEqual({ session_id: 'abc123', username: 'john' });

    // Malformed percent encoding
    const result4 = parseCookies('session_id=%ZZ; username=john');
    expect(result4).toEqual({ session_id: '%ZZ', username: 'john' });

    // Incomplete percent encoding
    const result5 = parseCookies('data=%2; valid=test');
    expect(result5).toEqual({ data: '%2', valid: 'test' });

    // Invalid UTF-8 sequence
    const result6 = parseCookies('token=%C0%80; user=alice');
    expect(result6).toEqual({ token: '%C0%80', user: 'alice' });

    // Multiple malformed values should not affect parsing of valid ones
    const result7 = parseCookies('bad1=%ZZ; good=valid; bad2=%2; another=test');
    expect(result7).toEqual({ bad1: '%ZZ', good: 'valid', bad2: '%2', another: 'test' });
  });

  test('should support targetName optimization', () => {
    // Extract specific cookie from multiple cookies
    const result1 = parseCookies('session=abc123; user=john; theme=dark', 'session');
    expect(result1).toEqual({ session: 'abc123' });

    // Extract specific cookie when it's not first
    const result2 = parseCookies('a=1; b=2; target=found; c=3', 'target');
    expect(result2).toEqual({ target: 'found' });

    // Return empty when target cookie not found
    const result3 = parseCookies('session=abc; user=john', 'missing');
    expect(result3).toEqual({});

    // Return empty when target name not in header string
    const result4 = parseCookies('other=value; different=cookie', 'session');
    expect(result4).toEqual({});

    // Works with malformed cookies (skips invalid, finds valid target)
    const result5 = parseCookies('invalid; target=found; bad=', 'target');
    expect(result5).toEqual({ target: 'found' });
  });
});
