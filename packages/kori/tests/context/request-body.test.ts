import { describe, test, expect } from 'vitest';

import { createKoriRequest } from '../../src/context/request.js';

describe('KoriRequest body contract', () => {
  describe('parseBody()', () => {
    test('default parseBody is JSON when content-type is missing', async () => {
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

    test('text/plain -> parseBody returns string', async () => {
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

    test('application/json -> parseBody returns parsed JSON', async () => {
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

    test('application/json with parameters (case-insensitive) -> parseBody returns parsed JSON', async () => {
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

    test('application/x-www-form-urlencoded -> parseBody returns FormData', async () => {
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

    test('multipart/form-data -> parseBody returns FormData', async () => {
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

    test('application/octet-stream -> parseBody returns ArrayBuffer', async () => {
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

    test('parseBody returns stable content across multiple calls (json)', async () => {
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

    test('parseBody returns stable content across multiple calls (urlencoded)', async () => {
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

    test('parseBody returns stable content across multiple calls (octet-stream)', async () => {
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

    test('other content types -> parseBody returns text', async () => {
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

    test('default parseBody throws when invalid JSON and no content-type', async () => {
      const raw = new Request('http://x', { method: 'POST', body: '{bad' });
      raw.headers.delete('content-type');
      const req = createKoriRequest({ rawRequest: raw, pathParams: {}, pathTemplate: '/' });
      await expect(req.parseBody()).rejects.toBeInstanceOf(SyntaxError);
    });
  });

  describe('bodyStream()', () => {
    test('returns a new ReadableStream each call', () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', { method: 'POST', body: 'x' }),
        pathParams: {},
        pathTemplate: '/',
      });

      const s1 = req.bodyStream();
      const s2 = req.bodyStream();
      expect(s1).not.toBe(s2);
    });

    test('returns null when no body', () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', { method: 'GET' }),
        pathParams: {},
        pathTemplate: '/',
      });
      expect(req.bodyStream()).toBeNull();
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

    test('caches across calls (content-equal)', async () => {
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

  describe('method independence', () => {
    test('consuming bodyStream first does not prevent bodyJson', async () => {
      const payload = { x: 1 };
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      const stream = req.bodyStream();

      expect(stream).toBeTruthy();
      if (stream) {
        // consume the stream fully
        await new Response(stream).text();
      }
      await expect(req.bodyJson()).resolves.toEqual(payload);
    });

    test('calling bodyJson first still allows reading bodyStream', async () => {
      const payload = { x: 2 };
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      await req.bodyJson();
      const stream = req.bodyStream();

      expect(stream).toBeTruthy();
      if (stream) {
        const text = await new Response(stream).text();
        expect(text).toBe(JSON.stringify(payload));
      }
    });

    test('after parseBody(json), bodyJson returns the same content', async () => {
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

    test('after parseBody(octet), bodyArrayBuffer returns the same content', async () => {
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
  });
});
