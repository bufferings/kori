import { describe, test, expect } from 'vitest';

import { createKoriRequest } from '../../src/context/request.js';

describe('KoriRequest headers contract', () => {
  describe('headers()', () => {
    test('returns lowercase-keyed map', () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          headers: {
            'X-Custom': 'A',
            'Content-Type': 'Application/JSON; charset=UTF-8',
          },
        }),
        pathParams: {},
        pathTemplate: '/',
      });

      const headers = req.headers();
      expect(headers['x-custom']).toBe('A');
      expect(headers['content-type']).toBe('Application/JSON; charset=UTF-8');
    });
  });

  describe('header()', () => {
    test('is case-insensitive and returns verbatim value', () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          headers: { 'Content-Type': 'Application/JSON; charset=UTF-8' },
        }),
        pathParams: {},
        pathTemplate: '/',
      });
      expect(req.header('content-type')).toBe('Application/JSON; charset=UTF-8');
      expect(req.header('CoNtEnT-TyPe')).toBe('Application/JSON; charset=UTF-8');
      expect(req.header('x-unknown')).toBeUndefined();
    });
  });

  describe('mediaType()', () => {
    test('strips parameters and lowercases media type', () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          headers: { 'Content-Type': 'Application/JSON; charset=UTF-8' },
        }),
        pathParams: {},
        pathTemplate: '/',
      });
      expect(req.mediaType()).toBe('application/json');
    });

    test('is undefined when header is missing', () => {
      const req = createKoriRequest({ rawRequest: new Request('http://x'), pathParams: {}, pathTemplate: '/' });
      expect(req.mediaType()).toBeUndefined();
    });

    test('is undefined when header is empty string', () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', { headers: { 'Content-Type': '' } }),
        pathParams: {},
        pathTemplate: '/',
      });
      expect(req.mediaType()).toBeUndefined();
    });

    test('is undefined when header is whitespace only', () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', { headers: { 'Content-Type': '   ' } }),
        pathParams: {},
        pathTemplate: '/',
      });
      expect(req.mediaType()).toBeUndefined();
    });

    test('is undefined when media type is missing (starts with delimiter)', () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', { headers: { 'Content-Type': '; charset=utf-8' } }),
        pathParams: {},
        pathTemplate: '/',
      });
      expect(req.mediaType()).toBeUndefined();
    });

    test('is undefined when media type is whitespace (delimiter with spaces)', () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', { headers: { 'Content-Type': '  ; charset=utf-8' } }),
        pathParams: {},
        pathTemplate: '/',
      });
      expect(req.mediaType()).toBeUndefined();
    });
  });

  describe('contentType()', () => {
    test('lowercases media type and parameter names but preserves parameter values', () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          headers: { 'Content-Type': '  Text/HTML ; Charset=UTF-8  ' },
        }),
        pathParams: {},
        pathTemplate: '/',
      });
      expect(req.contentType()).toBe('text/html; charset=UTF-8');
    });

    test('preserves case for multipart boundary', () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          headers: { 'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' },
        }),
        pathParams: {},
        pathTemplate: '/',
      });
      expect(req.contentType()).toBe('multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW');
    });

    test('normalizes spaces around = in parameters', () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', {
          headers: { 'Content-Type': 'Text/HTML; Charset = UTF-8' },
        }),
        pathParams: {},
        pathTemplate: '/',
      });
      expect(req.contentType()).toBe('text/html; charset=UTF-8');
    });

    test('is undefined when header is missing', () => {
      const req = createKoriRequest({ rawRequest: new Request('http://x'), pathParams: {}, pathTemplate: '/' });
      expect(req.contentType()).toBeUndefined();
    });

    test('is undefined when header is empty string', () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', { headers: { 'Content-Type': '' } }),
        pathParams: {},
        pathTemplate: '/',
      });
      expect(req.contentType()).toBeUndefined();
    });

    test('is undefined when header is whitespace only', () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', { headers: { 'Content-Type': '   ' } }),
        pathParams: {},
        pathTemplate: '/',
      });
      expect(req.contentType()).toBeUndefined();
    });

    test('is undefined when media type is missing (starts with delimiter)', () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', { headers: { 'Content-Type': '; charset=utf-8' } }),
        pathParams: {},
        pathTemplate: '/',
      });
      expect(req.contentType()).toBeUndefined();
    });

    test('is undefined when media type is whitespace (delimiter with spaces)', () => {
      const req = createKoriRequest({
        rawRequest: new Request('http://x', { headers: { 'Content-Type': '  ; charset=utf-8' } }),
        pathParams: {},
        pathTemplate: '/',
      });
      expect(req.contentType()).toBeUndefined();
    });
  });
});
