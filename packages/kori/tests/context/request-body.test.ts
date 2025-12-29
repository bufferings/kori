import { describe, test, expect } from 'vitest';

import { createKoriRequest } from '../../src/context/request.js';

describe('KoriRequest body contract', () => {
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

      let error: unknown;
      try {
        stream2.getReader();
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(TypeError);
      expect((error as Error).message).toBe('Invalid state: ReadableStream is locked');
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

      let error: unknown;
      try {
        await req.bodyJson();
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(TypeError);
      expect((error as Error).message).toBe('Body is unusable: Body has already been read');
    });

    test('consuming cached body prevents bodyStream() from working', async () => {
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

      let error: unknown;
      try {
        stream.getReader();
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(TypeError);
      expect((error as Error).message).toBe('Invalid state: ReadableStream is locked');
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

  describe('body method format restriction', () => {
    test('throws TypeError when reading body in different format', async () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          method: 'POST',
          body: 'hello',
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      await req.bodyText();

      let error: unknown;
      try {
        await req.bodyJson();
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(TypeError);
      expect((error as Error).message).toBe('Body is unusable: Body has already been read');
    });
  });
});
