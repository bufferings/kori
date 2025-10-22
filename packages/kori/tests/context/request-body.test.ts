import { describe, test, expect } from 'vitest';

import { createKoriRequest } from '../../src/context/request.js';

describe('KoriRequest body contract', () => {
  describe('parseBody()', () => {
    test('defaults to JSON when content-type is missing', async () => {
      // Create request without automatic content-type assignment
      const rawRequest = new Request('http://x', {
        method: 'POST',
        body: JSON.stringify({ ok: true }),
      });

      // Remove the automatically set content-type header
      rawRequest.headers.delete('content-type');

      const req = createKoriRequest({
        rawRequest,
        pathParams: {},
        pathTemplate: '/',
      });

      const body = await req.parseBody();
      expect(body).toEqual({ ok: true });
    });

    test('text/plain returns string', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'text/plain; charset=utf-8' },
          body: 'hello',
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      const body = await req.parseBody();
      expect(body).toBe('hello');
    });

    test('application/json returns parsed JSON', async () => {
      const data = { name: 'test', count: 42 };
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(data),
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      const body = await req.parseBody();
      expect(body).toEqual(data);
    });

    test('application/json with parameters (case-insensitive) returns parsed JSON', async () => {
      const data = { ok: true };
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'Application/JSON; Charset=UTF-8' },
          body: JSON.stringify(data),
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      const body = await req.parseBody();
      expect(body).toEqual(data);
    });

    test('application/x-www-form-urlencoded returns FormData', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: 'name=test&email=test%40example.com',
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      const body = await req.parseBody();
      expect(body instanceof FormData).toBe(true);
      expect((body as FormData).get('name')).toBe('test');
      expect((body as FormData).get('email')).toBe('test@example.com');
    });

    test('multipart/form-data returns FormData', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['hello world'], { type: 'text/plain' }), 'test.txt');
      formData.append('description', 'A test file');

      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          body: formData,
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      const body = await req.parseBody();
      expect(body instanceof FormData).toBe(true);
      expect((body as FormData).get('description')).toBe('A test file');
      expect((body as FormData).get('file')).toBeInstanceOf(File);
    });

    test('application/octet-stream returns ArrayBuffer', async () => {
      const buf = new Uint8Array([1, 2, 3]).buffer;
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/octet-stream' },
          body: new Uint8Array(buf),
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      const body = await req.parseBody();
      expect(body instanceof ArrayBuffer).toBe(true);
    });

    test('returns stable content across multiple calls (json)', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ a: 1 }),
        }),
        pathParams: {},
        pathTemplate: '/',
      });
      const a = await req.parseBody();
      const b = await req.parseBody();
      expect(a).toEqual({ a: 1 });
      expect(b).toEqual({ a: 1 });
    });

    test('returns stable content across multiple calls (urlencoded)', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: 'a=1&b=hello',
        }),
        pathParams: {},
        pathTemplate: '/',
      });
      const f1 = (await req.parseBody()) as FormData;
      const f2 = (await req.parseBody()) as FormData;
      expect(f1.get('a')).toBe('1');
      expect(f2.get('a')).toBe('1');
      expect(f1.get('b')).toBe('hello');
      expect(f2.get('b')).toBe('hello');
    });

    test('returns stable content across multiple calls (octet-stream)', async () => {
      const data = new Uint8Array([9, 8, 7]).buffer;
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/octet-stream' },
          body: new Uint8Array(data),
        }),
        pathParams: {},
        pathTemplate: '/',
      });
      const a = (await req.parseBody()) as ArrayBuffer;
      const b = (await req.parseBody()) as ArrayBuffer;
      expect(new Uint8Array(a)).toEqual(new Uint8Array(b));
    });

    test('other content types return text', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'text/html; charset=utf-8' },
          body: '<h1>Hello World</h1>',
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      const body = await req.parseBody();
      expect(body).toBe('<h1>Hello World</h1>');
    });

    test('throws when invalid JSON and no content-type', async () => {
      const raw = new Request('http://x', { method: 'POST', body: '{bad' });
      raw.headers.delete('content-type');
      const req = createKoriRequest({ rawRequest: raw, pathParams: {}, pathTemplate: '/' });
      await expect(req.parseBody()).rejects.toBeInstanceOf(SyntaxError);
    });
  });

  describe('bodyStream()', () => {
    test('returns the raw request body stream', () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', { method: 'POST', body: 'x' }),
        pathParams: {},
        pathTemplate: '/',
      });

      const stream = req.bodyStream();
      expect(stream).toBeInstanceOf(ReadableStream);
    });

    test('returns null when no body', () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', { method: 'GET' }),
        pathParams: {},
        pathTemplate: '/',
      });
      expect(req.bodyStream()).toBeNull();
    });

    test('stream can only be consumed once', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', { method: 'POST', body: 'hello' }),
        pathParams: {},
        pathTemplate: '/',
      });

      const stream = req.bodyStream();
      if (!stream) {
        expect.unreachable('stream should not be null');
      }

      const text1 = await new Response(stream).text();
      expect(text1).toBe('hello');

      const stream2 = req.bodyStream();
      expect(stream2).toBe(stream);
      if (!stream2) {
        expect.unreachable('stream should not be null');
      }

      expect(stream2.locked).toBe(true);
    });

    test('consuming bodyStream() prevents other body methods from working', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          body: JSON.stringify({ a: 1 }),
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      const stream = req.bodyStream();
      if (!stream) {
        expect.unreachable('stream should not be null');
      }

      await new Response(stream).text();

      await expect(req.bodyJson()).rejects.toThrow();
      await expect(req.bodyText()).rejects.toThrow();
    });

    test('calling bodyJson() first makes bodyStream() locked', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          body: JSON.stringify({ a: 1 }),
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      await req.bodyJson();

      const stream = req.bodyStream();
      if (!stream) {
        expect.unreachable('stream should not be null');
      }

      expect(stream.locked).toBe(true);
    });
  });

  describe('bodyJson()', () => {
    test('returns parsed JSON', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ a: 1 }),
        }),
        pathParams: {},
        pathTemplate: '/',
      });
      await expect(req.bodyJson()).resolves.toEqual({ a: 1 });
    });

    test('throws on invalid JSON', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{not-json}',
        }),
        pathParams: {},
        pathTemplate: '/',
      });
      await expect(req.bodyJson()).rejects.toBeInstanceOf(SyntaxError);
    });

    test('is stable across multiple calls', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ a: 1 }),
        }),
        pathParams: {},
        pathTemplate: '/',
      });
      await expect(req.bodyJson()).resolves.toEqual({ a: 1 });
      await expect(req.bodyJson()).resolves.toEqual({ a: 1 });
    });
  });

  describe('bodyText()', () => {
    test('returns text', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'text/plain' },
          body: 'hello text',
        }),
        pathParams: {},
        pathTemplate: '/',
      });
      await expect(req.bodyText()).resolves.toBe('hello text');
    });

    test('is stable across multiple calls', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'text/plain' },
          body: 'hello text',
        }),
        pathParams: {},
        pathTemplate: '/',
      });
      const first = await req.bodyText();
      const second = await req.bodyText();
      expect(first).toBe(second);
    });
  });

  describe('bodyFormData()', () => {
    test('handles multipart/form-data', async () => {
      const fd = new FormData();
      fd.append('name', 'alice');
      fd.append('file', new Blob(['abc'], { type: 'text/plain' }), 'a.txt');
      const req = createKoriRequest({
        rawRequest: new Request('http://x', { method: 'POST', body: fd }),
        pathParams: {},
        pathTemplate: '/',
      });
      const form = await req.bodyFormData();
      expect(form.get('name')).toBe('alice');
      expect(form.get('file')).toBeInstanceOf(File);
    });

    test('handles application/x-www-form-urlencoded', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: 'a=1&b=hello',
        }),
        pathParams: {},
        pathTemplate: '/',
      });
      const form = await req.bodyFormData();
      expect(form.get('a')).toBe('1');
      expect(form.get('b')).toBe('hello');
    });

    test('is stable across multiple calls (urlencoded)', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: 'a=1&b=hello',
        }),
        pathParams: {},
        pathTemplate: '/',
      });
      const f1 = await req.bodyFormData();
      const f2 = await req.bodyFormData();
      expect(f1.get('a')).toBe('1');
      expect(f2.get('a')).toBe('1');
      expect(f1.get('b')).toBe('hello');
      expect(f2.get('b')).toBe('hello');
    });
  });

  describe('bodyArrayBuffer()', () => {
    test('returns ArrayBuffer', async () => {
      const data = new Uint8Array([10, 20, 30]).buffer;
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/octet-stream' },
          body: new Uint8Array(data),
        }),
        pathParams: {},
        pathTemplate: '/',
      });
      const buf = await req.bodyArrayBuffer();
      expect(buf).toBeInstanceOf(ArrayBuffer);
      expect(buf.byteLength).toBe(3);
    });

    test('is stable across multiple calls', async () => {
      const data = new Uint8Array([10, 20, 30]).buffer;
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/octet-stream' },
          body: new Uint8Array(data),
        }),
        pathParams: {},
        pathTemplate: '/',
      });
      const first = await req.bodyArrayBuffer();
      const second = await req.bodyArrayBuffer();
      expect(new Uint8Array(first)).toEqual(new Uint8Array(second));
    });
  });

  describe('body method interoperability', () => {
    test('parseBody then bodyJson', async () => {
      const payload = { y: 3 };
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      await req.parseBody();
      await expect(req.bodyJson()).resolves.toEqual(payload);
    });

    test('parseBody then bodyArrayBuffer', async () => {
      const data = new Uint8Array([1, 2, 3]).buffer;
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/octet-stream' },
          body: new Uint8Array(data),
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      await req.parseBody();
      const buf = await req.bodyArrayBuffer();
      expect(new Uint8Array(buf)).toEqual(new Uint8Array(data));
    });

    test('bodyText then bodyJson and bodyArrayBuffer', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ a: 1 }),
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      await expect(req.bodyText()).resolves.toBe('{"a":1}');
      await expect(req.bodyJson()).resolves.toEqual({ a: 1 });
      await expect(req.bodyArrayBuffer()).resolves.toBeDefined();
    });

    test('bodyJson then bodyText and bodyArrayBuffer', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ x: 'hello' }),
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      await expect(req.bodyJson()).resolves.toEqual({ x: 'hello' });
      await expect(req.bodyText()).resolves.toBe('{"x":"hello"}');
      await expect(req.bodyArrayBuffer()).resolves.toBeDefined();
    });

    test('bodyFormData then bodyText and bodyArrayBuffer', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: 'name=test&value=123',
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      const formData = await req.bodyFormData();
      expect(formData.get('name')).toBe('test');

      await expect(req.bodyText()).resolves.toBeDefined();
      await expect(req.bodyArrayBuffer()).resolves.toBeDefined();
    });

    test('bodyArrayBuffer then bodyText', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/octet-stream' },
          body: 'binary data',
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      await expect(req.bodyArrayBuffer()).resolves.toBeDefined();
      await expect(req.bodyText()).resolves.toBe('binary data');
    });

    test('bodyJson parse error then bodyText still works', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{invalid json}',
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      await expect(req.bodyJson()).rejects.toBeInstanceOf(SyntaxError);
      await expect(req.bodyText()).resolves.toBe('{invalid json}');
    });
  });
});
