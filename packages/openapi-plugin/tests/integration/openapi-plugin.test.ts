import { createKori } from '@korix/kori';
import { type OpenAPIObject } from 'openapi3-ts/oas31';
import { describe, test, expect } from 'vitest';

import { type SchemaConverter } from '../../src/schema-converter/index.js';

import { openApiMeta } from '../../src/plugin/openapi-plugin-meta.js';
import { openApiPlugin } from '../../src/plugin/openapi-plugin.js';

describe('openApiPlugin integration', () => {
  const mockConverter: SchemaConverter = {
    name: 'mock',
    canConvert: () => true,
    convert: () => ({ type: 'object' }),
  };

  describe('plugin configuration', () => {
    test('serves document at default path', async () => {
      const kori = createKori().applyPlugin(
        openApiPlugin({
          info: { title: 'Test', version: '1.0.0' },
          converters: [mockConverter],
        }),
      );

      const { fetchHandler } = await kori.generate().onStart();
      const request = new Request('http://localhost/openapi.json');
      const response = await fetchHandler(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');

      const doc = (await response.json()) as OpenAPIObject;
      expect(doc).toEqual({
        openapi: '3.1.0',
        info: { title: 'Test', version: '1.0.0' },
        servers: [{ url: '/' }],
        paths: {},
      });
    });

    test('serves document at custom path', async () => {
      const kori = createKori().applyPlugin(
        openApiPlugin({
          info: { title: 'Test', version: '1.0.0' },
          documentPath: '/api-docs.json',
          converters: [mockConverter],
        }),
      );

      const { fetchHandler } = await kori.generate().onStart();
      const request = new Request('http://localhost/api-docs.json');
      const response = await fetchHandler(request);

      const doc = (await response.json()) as OpenAPIObject;
      expect(doc).toEqual({
        openapi: '3.1.0',
        info: { title: 'Test', version: '1.0.0' },
        servers: [{ url: '/' }],
        paths: {},
      });
    });

    test('excludes document endpoint from itself', async () => {
      const kori = createKori().applyPlugin(
        openApiPlugin({
          info: { title: 'Test', version: '1.0.0' },
          converters: [mockConverter],
        }),
      );

      const { fetchHandler } = await kori.generate().onStart();
      const request = new Request('http://localhost/openapi.json');
      const response = await fetchHandler(request);
      const doc = (await response.json()) as OpenAPIObject;

      expect(doc.paths?.['/openapi.json']).toBeUndefined();
    });

    test('includes custom servers', async () => {
      const kori = createKori().applyPlugin(
        openApiPlugin({
          info: { title: 'Test', version: '1.0.0' },
          servers: [{ url: 'https://api.example.com', description: 'Production' }],
          converters: [mockConverter],
        }),
      );

      const { fetchHandler } = await kori.generate().onStart();
      const request = new Request('http://localhost/openapi.json');
      const response = await fetchHandler(request);
      const doc = (await response.json()) as OpenAPIObject;

      expect(doc.servers).toEqual([{ url: 'https://api.example.com', description: 'Production' }]);
    });

    test('caches OpenAPI document', async () => {
      let converterCallCount = 0;
      const countingConverter: SchemaConverter = {
        name: 'counting',
        canConvert: () => true,
        convert: () => {
          converterCallCount++;
          return { type: 'object', properties: { id: { type: 'string' } } };
        },
      };

      const kori = createKori()
        .applyPlugin(
          openApiPlugin({
            info: { title: 'Test', version: '1.0.0' },
            converters: [countingConverter],
          }),
        )
        .get('/users', {
          responseSchema: {
            koriKind: 'kori-response-schema',
            provider: 'test',
            responses: {
              '200': {
                koriKind: 'kori-schema',
                provider: 'counting',
                definition: {},
              },
            },
          },
          handler: (ctx) => ctx.res.json({ id: '1' }),
        });

      const { fetchHandler } = await kori.generate().onStart();
      await fetchHandler(new Request('http://localhost/openapi.json'));
      expect(converterCallCount).toBe(1);

      await fetchHandler(new Request('http://localhost/openapi.json'));
      expect(converterCallCount).toBe(1);
    });
  });

  describe('route documentation', () => {
    test('includes routes with auto-generated operationId', async () => {
      const kori = createKori()
        .applyPlugin(
          openApiPlugin({
            info: { title: 'Test', version: '1.0.0' },
            converters: [mockConverter],
          }),
        )
        .get('/users', {
          handler: (ctx) => ctx.res.json([]),
        });

      const { fetchHandler } = await kori.generate().onStart();
      const request = new Request('http://localhost/openapi.json');
      const response = await fetchHandler(request);
      const doc = (await response.json()) as OpenAPIObject;

      expect(doc.paths).toEqual({
        '/users': {
          get: {
            operationId: 'getUsers',
            parameters: [],
            requestBody: undefined,
            responses: undefined,
          },
        },
      });
    });

    test('includes route metadata', async () => {
      const kori = createKori()
        .applyPlugin(
          openApiPlugin({
            info: { title: 'Test', version: '1.0.0' },
            converters: [mockConverter],
          }),
        )
        .get('/users', {
          pluginMeta: openApiMeta({
            summary: 'List users',
            tags: ['users'],
          }),
          handler: (ctx) => ctx.res.json([]),
        });

      const { fetchHandler } = await kori.generate().onStart();
      const request = new Request('http://localhost/openapi.json');
      const response = await fetchHandler(request);
      const doc = (await response.json()) as OpenAPIObject;

      expect(doc.paths).toEqual({
        '/users': {
          get: {
            operationId: 'getUsers',
            summary: 'List users',
            tags: ['users'],
            parameters: [],
            requestBody: undefined,
            responses: undefined,
          },
        },
      });
    });

    test('excludes routes with exclude flag', async () => {
      const kori = createKori()
        .applyPlugin(
          openApiPlugin({
            info: { title: 'Test', version: '1.0.0' },
            converters: [mockConverter],
          }),
        )
        .get('/public', {
          handler: (ctx) => ctx.res.json({}),
        })
        .get('/internal', {
          pluginMeta: openApiMeta({ exclude: true }),
          handler: (ctx) => ctx.res.json({}),
        });

      const { fetchHandler } = await kori.generate().onStart();
      const request = new Request('http://localhost/openapi.json');
      const response = await fetchHandler(request);
      const doc = (await response.json()) as OpenAPIObject;

      expect(doc.paths).toEqual({
        '/public': {
          get: {
            operationId: 'getPublic',
            parameters: [],
            requestBody: undefined,
            responses: undefined,
          },
        },
      });
    });
  });

  describe('schema conversion', () => {
    test('converts path parameters to OpenAPI parameters', async () => {
      const paramsConverter: SchemaConverter = {
        name: 'params',
        canConvert: ({ schema }) => schema.provider === 'params',
        convert: () => ({
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User ID' },
          },
          required: ['id'],
        }),
      };

      const kori = createKori()
        .applyPlugin(
          openApiPlugin({
            info: { title: 'Test', version: '1.0.0' },
            converters: [paramsConverter],
          }),
        )
        .get('/users/:id', {
          requestSchema: {
            koriKind: 'kori-request-schema',
            provider: 'test',
            params: {
              koriKind: 'kori-schema',
              provider: 'params',
              definition: {},
            },
          },
          handler: (ctx) => ctx.res.json({ id: ctx.req.param('id') }),
        });

      const { fetchHandler } = await kori.generate().onStart();
      const response = await fetchHandler(new Request('http://localhost/openapi.json'));
      const doc = (await response.json()) as OpenAPIObject;

      expect(doc.paths).toEqual({
        '/users/{id}': {
          get: {
            operationId: 'getUsersById',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                description: 'User ID',
                schema: { type: 'string', description: 'User ID' },
              },
            ],
            requestBody: undefined,
            responses: undefined,
          },
        },
      });
    });

    test('converts request schema to requestBody', async () => {
      const bodyConverter: SchemaConverter = {
        name: 'body',
        canConvert: ({ schema }) => schema.provider === 'body',
        convert: () => ({
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
          },
          required: ['name'],
        }),
      };

      const kori = createKori()
        .applyPlugin(
          openApiPlugin({
            info: { title: 'Test', version: '1.0.0' },
            converters: [bodyConverter],
          }),
        )
        .post('/users', {
          requestSchema: {
            koriKind: 'kori-request-schema',
            provider: 'test',
            body: {
              koriKind: 'kori-schema',
              provider: 'body',
              definition: {},
            },
          },
          handler: (ctx) => ctx.res.json({ id: '1' }),
        });

      const { fetchHandler } = await kori.generate().onStart();
      const response = await fetchHandler(new Request('http://localhost/openapi.json'));
      const doc = (await response.json()) as OpenAPIObject;

      expect(doc.paths).toEqual({
        '/users': {
          post: {
            operationId: 'postUsers',
            parameters: [],
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      email: { type: 'string' },
                    },
                    required: ['name'],
                  },
                },
              },
              required: true,
            },
            responses: undefined,
          },
        },
      });
    });

    test('converts response schema to responses', async () => {
      const responseConverter: SchemaConverter = {
        name: 'response',
        canConvert: ({ schema }) => schema.provider === 'response',
        convert: () => ({
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
        }),
      };

      const kori = createKori()
        .applyPlugin(
          openApiPlugin({
            info: { title: 'Test', version: '1.0.0' },
            converters: [responseConverter],
          }),
        )
        .get('/users/:id', {
          responseSchema: {
            koriKind: 'kori-response-schema',
            provider: 'test',
            responses: {
              '200': {
                koriKind: 'kori-schema',
                provider: 'response',
                definition: {},
              },
            },
          },
          handler: (ctx) => ctx.res.json({ id: ctx.req.param('id'), name: 'John' }),
        });

      const { fetchHandler } = await kori.generate().onStart();
      const response = await fetchHandler(new Request('http://localhost/openapi.json'));
      const doc = (await response.json()) as OpenAPIObject;

      expect(doc.paths).toEqual({
        '/users/{id}': {
          get: {
            operationId: 'getUsersById',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
            requestBody: undefined,
            responses: {
              200: {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    });
  });

  describe('path patterns', () => {
    test('handles advanced path patterns', async () => {
      const kori = createKori()
        .applyPlugin(
          openApiPlugin({
            info: { title: 'Test', version: '1.0.0' },
            converters: [mockConverter],
          }),
        )
        .get('/api/:version?', {
          handler: (ctx) => ctx.res.json({}),
        })
        .get('/post/:date{[0-9]+}', {
          handler: (ctx) => ctx.res.json({}),
        });

      const { fetchHandler } = await kori.generate().onStart();
      const response = await fetchHandler(new Request('http://localhost/openapi.json'));
      const doc = (await response.json()) as OpenAPIObject;

      expect(doc.paths).toEqual({
        '/api/{version}': {
          get: {
            operationId: 'getApiByVersion',
            parameters: [
              {
                name: 'version',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
            requestBody: undefined,
            responses: undefined,
          },
        },
        '/post/{date}': {
          get: {
            operationId: 'getPostByDate',
            parameters: [
              {
                name: 'date',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
            requestBody: undefined,
            responses: undefined,
          },
        },
      });
    });

    test('skips unsupported patterns', async () => {
      const kori = createKori()
        .applyPlugin(
          openApiPlugin({
            info: { title: 'Test', version: '1.0.0' },
            converters: [mockConverter],
          }),
        )
        .get('/users/:id', {
          handler: (ctx) => ctx.res.json({ id: ctx.req.param('id') }),
        })
        .get('/files/*', {
          handler: (ctx) => ctx.res.text('file content'),
        })
        .route({
          method: { custom: 'CUSTOM' },
          path: '/custom',
          handler: (ctx) => ctx.res.json({}),
        });

      const { fetchHandler } = await kori.generate().onStart();
      const response = await fetchHandler(new Request('http://localhost/openapi.json'));
      const doc = (await response.json()) as OpenAPIObject;

      expect(doc.paths).toEqual({
        '/users/{id}': {
          get: {
            operationId: 'getUsersById',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
            requestBody: undefined,
            responses: undefined,
          },
        },
      });
    });
  });
});
