import { describe, test, expect } from 'vitest';

import { KoriSetCookieHeaderError } from '../../src/error/index.js';

import { createKoriResponse } from '../../src/context/response.js';

describe('KoriResponse headers contract', () => {
  describe('setHeader()', () => {
    test('sets value and overwrites existing values', () => {
      const res = createKoriResponse();

      res.setHeader('x-one', '1');
      expect(res.getHeader('x-one')).toBe('1');

      res.setHeader('x-one', '2');
      expect(res.getHeader('x-one')).toBe('2');
    });

    test('keeps literal commas in a single value', () => {
      const res = createKoriResponse();

      res.setHeader('x-comma', 'a, b');
      expect(res.getHeader('x-comma')).toBe('a, b');
    });

    test('case-insensitive name overwrites (X-Case vs x-case)', () => {
      const res = createKoriResponse();

      res.setHeader('X-Case', 'A');
      expect(res.getHeader('x-case')).toBe('A');

      res.setHeader('x-case', 'B');
      expect(res.getHeader('X-Case')).toBe('B');
    });

    test('guards: setHeader("set-cookie", ...) throws', () => {
      const res = createKoriResponse();
      expect(() => res.setHeader('set-cookie', 'a=1')).toThrow(KoriSetCookieHeaderError);
    });
  });

  describe('appendHeader()', () => {
    test('appends values and keeps them comma-joined', () => {
      const res = createKoriResponse();

      res.appendHeader('x-c', '1');
      res.appendHeader('x-c', '2');

      expect(res.getHeader('x-c')).toBe('1, 2');
    });

    test('preserves commas inside existing value when appending', () => {
      const res = createKoriResponse();

      res.setHeader('x-c', 'a, b');
      res.appendHeader('x-c', 'c');

      expect(res.getHeader('x-c')).toBe('a, b, c');
    });

    test('guards: appendHeader("set-cookie", ...) throws', () => {
      const res = createKoriResponse();
      expect(() => res.appendHeader('set-cookie', 'a=1')).toThrow(KoriSetCookieHeaderError);
    });
  });

  describe('removeHeader()', () => {
    test('removes previously set header', () => {
      const res = createKoriResponse();
      res.setHeader('x-one', '1');
      expect(res.getHeader('x-one')).toBe('1');

      res.removeHeader('x-one');

      expect(res.getHeader('x-one')).toBeUndefined();
    });

    test('case-insensitive remove works (X-Rem vs x-rem)', () => {
      const res = createKoriResponse();
      res.setHeader('X-Rem', '1');
      expect(res.getHeader('x-rem')).toBe('1');

      res.removeHeader('x-rem');

      expect(res.getHeader('X-Rem')).toBeUndefined();
    });

    test('removing unknown header is a no-op', () => {
      const res = createKoriResponse();

      res.setHeader('x-one', '1');

      expect(() => res.removeHeader('x-unknown')).not.toThrow();
      expect(res.getHeader('x-one')).toBe('1');
    });

    test('guards: removeHeader("set-cookie") clears cookies', () => {
      const res = createKoriResponse();
      res.setCookie('a', '1');
      res.setCookie('b', '2');
      expect(res.getHeader('set-cookie')).toBeTruthy();

      res.removeHeader('set-cookie');

      expect(res.getHeader('set-cookie')).toBeUndefined();

      const built = res.build();
      expect(built.headers.get('set-cookie')).toBeNull();
    });
  });

  describe('getHeadersCopy()', () => {
    test('returns a snapshot independent from later mutations', () => {
      const res = createKoriResponse();
      res.setHeader('content-type', 'application/custom');
      res.appendHeader('x-a', '1').appendHeader('x-a', '2');

      const copy = res.getHeadersCopy();
      expect(copy.get('content-type')).toBe('application/custom');
      expect(copy.get('x-a')).toBe('1, 2');

      res.removeHeader('content-type');

      const copy2 = res.getHeadersCopy();
      expect(copy.get('content-type')).toBe('application/custom');
      expect(copy2.get('content-type')).toBeNull();
    });

    test('header name matching is case-insensitive in getHeadersCopy', () => {
      const res = createKoriResponse();

      res.setHeader('Content-Type', 'application/custom');

      const copy = res.getHeadersCopy();
      expect(copy.get('content-type')).toBe('application/custom');
      expect(copy.get('Content-Type')).toBe('application/custom');
    });

    test('json -> application/json; charset=utf-8 (pre-build default)', () => {
      const res = createKoriResponse();
      res.json({ ok: true });

      const copy = res.getHeadersCopy();
      expect(copy.get('content-type')).toBe('application/json; charset=utf-8');
    });

    test('text -> text/plain; charset=utf-8 (pre-build default)', () => {
      const res = createKoriResponse();
      res.text('hi');

      const copy = res.getHeadersCopy();
      expect(copy.get('content-type')).toBe('text/plain; charset=utf-8');
    });

    test('html -> text/html; charset=utf-8 (pre-build default)', () => {
      const res = createKoriResponse();
      res.html('<p>ok</p>');

      const copy = res.getHeadersCopy();
      expect(copy.get('content-type')).toBe('text/html; charset=utf-8');
    });

    test('stream -> application/octet-stream (pre-build default)', () => {
      const res = createKoriResponse();
      res.stream(new ReadableStream());

      const copy = res.getHeadersCopy();
      expect(copy.get('content-type')).toBe('application/octet-stream');
    });

    test('empty -> no content-type (pre-build default)', () => {
      const res = createKoriResponse();
      res.empty();

      const copy = res.getHeadersCopy();
      expect(copy.get('content-type')).toBeNull();
    });
  });

  describe('getContentType()', () => {
    test('returns correct value after res.json()', () => {
      const res = createKoriResponse();
      expect(res.getContentType()).toBeUndefined();

      res.json({ message: 'test' });
      expect(res.getContentType()).toBe('application/json; charset=utf-8');

      const response = res.build();
      expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    });

    test('returns correct value after res.text()', () => {
      const res = createKoriResponse();

      res.text('test message');
      expect(res.getContentType()).toBe('text/plain; charset=utf-8');

      const response = res.build();
      expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    });

    test('returns correct value after res.html()', () => {
      const res = createKoriResponse();

      res.html('<p>test</p>');
      expect(res.getContentType()).toBe('text/html; charset=utf-8');

      const response = res.build();
      expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    });

    test('returns undefined after res.empty()', () => {
      const res = createKoriResponse();

      res.empty();
      expect(res.getContentType()).toBeUndefined();

      const response = res.build();
      expect(response.headers.get('content-type')).toBeNull();
    });

    test('returns octet-stream after res.stream()', () => {
      const res = createKoriResponse();

      const stream = new ReadableStream();
      res.stream(stream);
      expect(res.getContentType()).toBe('application/octet-stream');

      const response = res.build();
      expect(response.headers.get('content-type')).toBe('application/octet-stream');
    });
  });

  describe('getMediaType()', () => {
    test('returns media type without parameters after res.json()', () => {
      const res = createKoriResponse();
      expect(res.getMediaType()).toBeUndefined();

      res.json({ message: 'test' });
      expect(res.getMediaType()).toBe('application/json');
    });

    test('returns media type without parameters after res.text()', () => {
      const res = createKoriResponse();

      res.text('test message');
      expect(res.getMediaType()).toBe('text/plain');
    });

    test('returns media type without parameters after res.html()', () => {
      const res = createKoriResponse();

      res.html('<p>test</p>');
      expect(res.getMediaType()).toBe('text/html');
    });

    test('returns undefined after res.empty()', () => {
      const res = createKoriResponse();

      res.empty();
      expect(res.getMediaType()).toBeUndefined();
    });

    test('returns octet-stream after res.stream()', () => {
      const res = createKoriResponse();

      const stream = new ReadableStream();
      res.stream(stream);
      expect(res.getMediaType()).toBe('application/octet-stream');
    });

    test('extracts media type from manual content-type header', () => {
      const res = createKoriResponse();

      res.setHeader('content-type', 'application/custom; charset=utf-8; boundary=something');
      expect(res.getMediaType()).toBe('application/custom');
    });

    test('handles content-type header with only media type', () => {
      const res = createKoriResponse();

      res.setHeader('content-type', 'text/csv');
      expect(res.getMediaType()).toBe('text/csv');
    });
  });

  describe('manual content-type precedence', () => {
    describe('json()', () => {
      test('manual before body is preserved (get/build)', () => {
        const res = createKoriResponse();

        res.setHeader('content-type', 'application/custom').json({ ok: true });
        expect(res.getContentType()).toBe('application/custom');

        const built = res.build();
        expect(built.headers.get('content-type')).toBe('application/custom');
      });

      test('manual after body overrides default (get/build)', () => {
        const res = createKoriResponse();

        res.json({ ok: true });
        expect(res.getContentType()).toBe('application/json; charset=utf-8');

        res.setHeader('content-type', 'application/vnd.api+json');
        expect(res.getContentType()).toBe('application/vnd.api+json');

        const built = res.build();
        expect(built.headers.get('content-type')).toBe('application/vnd.api+json');
      });
    });

    describe('text()', () => {
      test('manual before body is preserved (get/build)', () => {
        const res = createKoriResponse();

        res.setHeader('content-type', 'text/custom').text('hi');
        expect(res.getContentType()).toBe('text/custom');

        const built = res.build();
        expect(built.headers.get('content-type')).toBe('text/custom');
      });

      test('manual after body overrides default (get/build)', () => {
        const res = createKoriResponse();

        res.text('hi');
        expect(res.getContentType()).toBe('text/plain; charset=utf-8');

        res.setHeader('content-type', 'text/custom');
        expect(res.getContentType()).toBe('text/custom');

        const built = res.build();
        expect(built.headers.get('content-type')).toBe('text/custom');
      });
    });

    describe('html()', () => {
      test('manual before body is preserved (get/build)', () => {
        const res = createKoriResponse();

        res.setHeader('content-type', 'text/custom').html('<p>ok</p>');
        expect(res.getContentType()).toBe('text/custom');

        const built = res.build();
        expect(built.headers.get('content-type')).toBe('text/custom');
      });

      test('manual after body overrides default (get/build)', () => {
        const res = createKoriResponse();

        res.html('<p>ok</p>');
        expect(res.getContentType()).toBe('text/html; charset=utf-8');

        res.setHeader('content-type', 'text/custom');
        expect(res.getContentType()).toBe('text/custom');

        const built = res.build();
        expect(built.headers.get('content-type')).toBe('text/custom');
      });
    });

    describe('empty()', () => {
      test('manual before body is preserved (get/build)', () => {
        const res = createKoriResponse();

        res.setHeader('content-type', 'application/custom').empty();
        expect(res.getContentType()).toBe('application/custom');

        const built = res.build();
        expect(built.headers.get('content-type')).toBe('application/custom');
      });

      test('manual after body sets content-type (get/build)', () => {
        const res = createKoriResponse();

        res.empty();
        expect(res.getContentType()).toBeUndefined();

        res.setHeader('content-type', 'application/custom');
        expect(res.getContentType()).toBe('application/custom');

        const built = res.build();
        expect(built.headers.get('content-type')).toBe('application/custom');
      });
    });

    describe('stream()', () => {
      test('manual before body is preserved (get/build)', () => {
        const res = createKoriResponse();

        res.setHeader('content-type', 'application/custom').stream(new ReadableStream());
        expect(res.getContentType()).toBe('application/custom');

        const built = res.build();
        expect(built.headers.get('content-type')).toBe('application/custom');
      });

      test('manual after body overrides default (get/build)', () => {
        const res = createKoriResponse();

        res.stream(new ReadableStream());
        expect(res.getContentType()).toBe('application/octet-stream');

        res.setHeader('content-type', 'application/custom');
        expect(res.getContentType()).toBe('application/custom');

        const built = res.build();
        expect(built.headers.get('content-type')).toBe('application/custom');
      });
    });
  });
});
