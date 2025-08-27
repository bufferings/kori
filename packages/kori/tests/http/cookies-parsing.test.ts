import { describe, expect, test } from 'vitest';

import { parseCookies } from '../../src/http/cookies.js';

describe('parseCookies', () => {
  test('should parse simple cookie', () => {
    const result = parseCookies({ cookieHeader: 'session_id=abc123' });
    expect(result).toEqual({ session_id: 'abc123' });
  });

  test('should parse multiple cookies', () => {
    const result = parseCookies({ cookieHeader: 'session_id=abc123; username=john; theme=dark' });
    expect(result).toEqual({
      session_id: 'abc123',
      username: 'john',
      theme: 'dark',
    });
  });

  test('should parse URL-encoded values', () => {
    const result = parseCookies({ cookieHeader: 'message=hello%20world; name=john%40example.com' });
    expect(result).toEqual({
      message: 'hello world',
      name: 'john@example.com',
    });
  });

  test('should parse simple quoted value', () => {
    const result = parseCookies({ cookieHeader: 'a="b"' });
    expect(result).toEqual({ a: 'b' });
  });

  test('should parse quoted values with spaces', () => {
    const result = parseCookies({ cookieHeader: 'message="hello world"; name="john doe"' });
    expect(result).toEqual({ message: 'hello world', name: 'john doe' });
  });

  test('should parse empty quoted values', () => {
    const result = parseCookies({ cookieHeader: 'empty=""; nonempty="test"' });
    expect(result).toEqual({ empty: '', nonempty: 'test' });
  });

  test('should ignore cookies with unmatched quotes', () => {
    // Per RFC 6265, semicolons are not allowed in cookie values.
    // Parsing splits on ';' first, so a quoted segment containing ';' is
    // broken into separate tokens and the ones with unmatched quotes are invalid.
    const header = 'bad="value; good=ok; another="oops';
    const result = parseCookies({ cookieHeader: header });
    expect(result).toEqual({ good: 'ok' });
  });

  test('should parse percent-encoded special characters in values', () => {
    const header = 'msg=hello%3Bworld%20%22x%22';
    const result = parseCookies({ cookieHeader: header });
    expect(result).toEqual({ msg: 'hello;world "x"' });
  });

  test('should parse unquoted values with spaces (lenient RFC 6265)', () => {
    // RFC 6265 technically requires quotes for values with spaces: name="hello world"
    // But we accept unquoted values for browser compatibility and practical usage

    // Values with spaces (unencoded, RFC violation but common)
    const result1 = parseCookies({ cookieHeader: 'name=hello world' });
    expect(result1).toEqual({ name: 'hello world' });

    // Multiple cookies with spaced values
    const result2 = parseCookies({ cookieHeader: 'session=abc def; user=john doe; id=123' });
    expect(result2).toEqual({ session: 'abc def', user: 'john doe', id: '123' });

    // Mixed encoded and unencoded spaces
    const result3 = parseCookies({ cookieHeader: 'encoded=hello%20world; unencoded=hello world' });
    expect(result3).toEqual({ encoded: 'hello world', unencoded: 'hello world' });
  });

  test('should parse empty cookie header', () => {
    const result1 = parseCookies({ cookieHeader: '' });
    expect(result1).toEqual({});

    const result2 = parseCookies({ cookieHeader: undefined });
    expect(result2).toEqual({});
  });

  test('should parse malformed cookie formats gracefully', () => {
    // Cookie without value
    const result1 = parseCookies({ cookieHeader: 'session_id=; username=john' });
    expect(result1).toEqual({ session_id: '', username: 'john' });

    // Cookie without equals sign
    const result2 = parseCookies({ cookieHeader: 'session_id; username=john' });
    expect(result2).toEqual({ username: 'john' });

    // Extra spaces
    const result3 = parseCookies({ cookieHeader: '  session_id = abc123  ;  username = john  ' });
    expect(result3).toEqual({ session_id: 'abc123', username: 'john' });

    // Malformed percent encoding
    const result4 = parseCookies({ cookieHeader: 'session_id=%ZZ; username=john' });
    expect(result4).toEqual({ session_id: '%ZZ', username: 'john' });

    // Incomplete percent encoding
    const result5 = parseCookies({ cookieHeader: 'data=%2; valid=test' });
    expect(result5).toEqual({ data: '%2', valid: 'test' });

    // Invalid UTF-8 sequence
    const result6 = parseCookies({ cookieHeader: 'token=%C0%80; user=alice' });
    expect(result6).toEqual({ token: '%C0%80', user: 'alice' });

    // Multiple malformed values should not affect parsing of valid ones
    const result7 = parseCookies({ cookieHeader: 'bad1=%ZZ; good=valid; bad2=%2; another=test' });
    expect(result7).toEqual({ bad1: '%ZZ', good: 'valid', bad2: '%2', another: 'test' });
  });

  test('should support targetName optimization', () => {
    // Extract specific cookie from multiple cookies
    const result1 = parseCookies({ cookieHeader: 'session=abc123; user=john; theme=dark', targetName: 'session' });
    expect(result1).toEqual({ session: 'abc123' });

    // Extract specific cookie when it's not first
    const result2 = parseCookies({ cookieHeader: 'a=1; b=2; target=found; c=3', targetName: 'target' });
    expect(result2).toEqual({ target: 'found' });

    // Return empty when target cookie not found
    const result3 = parseCookies({ cookieHeader: 'session=abc; user=john', targetName: 'missing' });
    expect(result3).toEqual({});

    // Return empty when target name not in header string
    const result4 = parseCookies({ cookieHeader: 'other=value; different=cookie', targetName: 'session' });
    expect(result4).toEqual({});

    // Works with malformed cookies (skips invalid, finds valid target)
    const result5 = parseCookies({ cookieHeader: 'invalid; target=found; bad=', targetName: 'target' });
    expect(result5).toEqual({ target: 'found' });
  });
});
