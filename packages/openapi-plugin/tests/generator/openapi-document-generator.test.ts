import { type KoriRouteDefinition } from '@korix/kori';
import { describe, test, expect } from 'vitest';

import { type SchemaConverter } from '../../src/schema-converter/index.js';

import {
  createOpenApiDocumentGenerator,
  toOpenApiPath,
  toOpenApiMethod,
} from '../../src/generator/openapi-document-generator.js';
import { openApiMeta } from '../../src/plugin/openapi-plugin-meta.js';
import { createLoggerStub, createTestSchema } from '../test-helpers.js';

describe('createOpenApiDocumentGenerator', () => {
  const mockConverter: SchemaConverter = {
    name: 'mock',
    canConvert: () => true,
    convert: () => ({ type: 'object' }),
  };

  describe('basic generation', () => {
    test('generates basic OpenAPI document', () => {
      const generator = createOpenApiDocumentGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        converters: [mockConverter],
      });

      const routeDefinitions: KoriRouteDefinition[] = [];
      const doc = generator({ routeDefinitions, log: createLoggerStub() });

      expect(doc).toEqual({
        openapi: '3.1.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        servers: [{ url: '/' }],
        paths: {},
      });
    });

    test('includes custom servers', () => {
      const generator = createOpenApiDocumentGenerator({
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        servers: [
          { url: 'https://api.example.com', description: 'Production' },
          { url: 'https://dev.example.com', description: 'Development' },
        ],
        converters: [mockConverter],
      });

      const doc = generator({ routeDefinitions: [], log: createLoggerStub() });

      expect(doc).toEqual({
        openapi: '3.1.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        servers: [
          { url: 'https://api.example.com', description: 'Production' },
          { url: 'https://dev.example.com', description: 'Development' },
        ],
        paths: {},
      });
    });
  });

  describe('path handling', () => {
    test('generates path from route definition', () => {
      const generator = createOpenApiDocumentGenerator({
        info: { title: 'Test', version: '1.0.0' },
        converters: [mockConverter],
      });

      const routeDefinitions: KoriRouteDefinition[] = [
        {
          method: 'GET',
          path: '/users',
        },
      ];

      const doc = generator({ routeDefinitions, log: createLoggerStub() });

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

    test('converts Kori path parameters to OpenAPI format', () => {
      const generator = createOpenApiDocumentGenerator({
        info: { title: 'Test', version: '1.0.0' },
        converters: [mockConverter],
      });

      const routeDefinitions: KoriRouteDefinition[] = [
        {
          method: 'GET',
          path: '/users/:id/posts/:postId',
        },
      ];

      const doc = generator({ routeDefinitions, log: createLoggerStub() });

      expect(doc.paths).toEqual({
        '/users/{id}/posts/{postId}': {
          get: {
            operationId: 'getUsersByIdPostsByPostId',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
              {
                name: 'postId',
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

    test('handles multiple HTTP methods for same path', () => {
      const generator = createOpenApiDocumentGenerator({
        info: { title: 'Test', version: '1.0.0' },
        converters: [mockConverter],
      });

      const routeDefinitions: KoriRouteDefinition[] = [
        { method: 'GET', path: '/users' },
        { method: 'POST', path: '/users' },
      ];

      const doc = generator({ routeDefinitions, log: createLoggerStub() });

      expect(doc.paths).toEqual({
        '/users': {
          get: {
            operationId: 'getUsers',
            parameters: [],
            requestBody: undefined,
            responses: undefined,
          },
          post: {
            operationId: 'postUsers',
            parameters: [],
            requestBody: undefined,
            responses: undefined,
          },
        },
      });
    });

    test('normalizes HTTP method to lowercase', () => {
      const generator = createOpenApiDocumentGenerator({
        info: { title: 'Test', version: '1.0.0' },
        converters: [mockConverter],
      });

      const routeDefinitions: KoriRouteDefinition[] = [
        { method: 'GET', path: '/users' },
        { method: 'POST', path: '/posts' },
      ];

      const doc = generator({ routeDefinitions, log: createLoggerStub() });

      expect(doc.paths).toEqual({
        '/users': {
          get: {
            operationId: 'getUsers',
            parameters: [],
            requestBody: undefined,
            responses: undefined,
          },
        },
        '/posts': {
          post: {
            operationId: 'postPosts',
            parameters: [],
            requestBody: undefined,
            responses: undefined,
          },
        },
      });
    });
  });

  describe('path conversion', () => {
    test('converts single path parameter', () => {
      expect(toOpenApiPath('/users/:id')).toBe('/users/{id}');
    });

    test('converts multiple path parameters', () => {
      expect(toOpenApiPath('/users/:id/posts/:postId')).toBe('/users/{id}/posts/{postId}');
    });

    test('keeps path without parameters unchanged', () => {
      expect(toOpenApiPath('/users')).toBe('/users');
    });

    test('converts parameter at the beginning', () => {
      expect(toOpenApiPath('/:id')).toBe('/{id}');
    });

    test('converts parameter at the end', () => {
      expect(toOpenApiPath('/users/:id')).toBe('/users/{id}');
    });

    test('removes optional marker from parameter', () => {
      expect(toOpenApiPath('/api/animal/:type?')).toBe('/api/animal/{type}');
    });

    test('removes regex constraint from parameter', () => {
      expect(toOpenApiPath('/post/:date{[0-9]+}')).toBe('/post/{date}');
    });

    test('removes both optional and regex from parameter', () => {
      expect(toOpenApiPath('/api/:version{.*}?')).toBe('/api/{version}');
    });

    test('handles wildcard as-is', () => {
      expect(toOpenApiPath('/files/*')).toBe('/files/*');
    });
  });

  describe('method conversion', () => {
    test('converts GET to lowercase', () => {
      expect(toOpenApiMethod('GET')).toBe('get');
    });

    test('converts POST to lowercase', () => {
      expect(toOpenApiMethod('POST')).toBe('post');
    });

    test('converts PUT to lowercase', () => {
      expect(toOpenApiMethod('PUT')).toBe('put');
    });

    test('converts DELETE to lowercase', () => {
      expect(toOpenApiMethod('DELETE')).toBe('delete');
    });

    test('converts PATCH to lowercase', () => {
      expect(toOpenApiMethod('PATCH')).toBe('patch');
    });

    test('converts OPTIONS to lowercase', () => {
      expect(toOpenApiMethod('OPTIONS')).toBe('options');
    });

    test('returns undefined for custom method', () => {
      expect(toOpenApiMethod({ custom: 'CUSTOM' })).toBeUndefined();
    });
  });

  describe('unsupported patterns', () => {
    test('skips routes with custom HTTP methods', () => {
      const generator = createOpenApiDocumentGenerator({
        info: { title: 'Test', version: '1.0.0' },
        converters: [mockConverter],
      });

      const routeDefinitions: KoriRouteDefinition[] = [
        { method: 'GET', path: '/standard' },
        { method: { custom: 'CUSTOM' }, path: '/custom' },
      ];

      const doc = generator({ routeDefinitions, log: createLoggerStub() });

      expect(doc.paths).toEqual({
        '/standard': {
          get: {
            operationId: 'getStandard',
            parameters: [],
            requestBody: undefined,
            responses: undefined,
          },
        },
      });
    });

    test('skips routes with wildcard paths', () => {
      const generator = createOpenApiDocumentGenerator({
        info: { title: 'Test', version: '1.0.0' },
        converters: [mockConverter],
      });

      const routeDefinitions: KoriRouteDefinition[] = [
        { method: 'GET', path: '/users/:id' },
        // Regex asterisk - not skipped (converted to /api/{version})
        { method: 'GET', path: '/api/:version{.*}?' },
        // Wildcard - skipped
        { method: 'GET', path: '/files/*' },
      ];

      const doc = generator({ routeDefinitions, log: createLoggerStub() });

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
      });
    });
  });

  describe('operation id generation', () => {
    test('generates operationId for root path', () => {
      const generator = createOpenApiDocumentGenerator({
        info: { title: 'Test', version: '1.0.0' },
        converters: [mockConverter],
      });

      const routeDefinitions: KoriRouteDefinition[] = [{ method: 'GET', path: '/' }];

      const doc = generator({ routeDefinitions, log: createLoggerStub() });

      expect(doc.paths?.['/']?.get?.operationId).toBe('getIndex');
    });

    test('generates operationId from method and path', () => {
      const generator = createOpenApiDocumentGenerator({
        info: { title: 'Test', version: '1.0.0' },
        converters: [mockConverter],
      });

      const routeDefinitions: KoriRouteDefinition[] = [
        { method: 'GET', path: '/users' },
        { method: 'POST', path: '/users' },
      ];

      const doc = generator({ routeDefinitions, log: createLoggerStub() });

      expect(doc.paths?.['/users']?.get?.operationId).toBe('getUsers');
      expect(doc.paths?.['/users']?.post?.operationId).toBe('postUsers');
    });

    test('generates operationId with parameter', () => {
      const generator = createOpenApiDocumentGenerator({
        info: { title: 'Test', version: '1.0.0' },
        converters: [mockConverter],
      });

      const routeDefinitions: KoriRouteDefinition[] = [{ method: 'GET', path: '/users/:id' }];

      const doc = generator({ routeDefinitions, log: createLoggerStub() });

      expect(doc.paths?.['/users/{id}']?.get?.operationId).toBe('getUsersById');
    });

    test('generates operationId with multiple parameters', () => {
      const generator = createOpenApiDocumentGenerator({
        info: { title: 'Test', version: '1.0.0' },
        converters: [mockConverter],
      });

      const routeDefinitions: KoriRouteDefinition[] = [{ method: 'GET', path: '/teams/:teamId/users/:userId' }];

      const doc = generator({ routeDefinitions, log: createLoggerStub() });

      expect(doc.paths?.['/teams/{teamId}/users/{userId}']?.get?.operationId).toBe('getTeamsByTeamIdUsersByUserId');
    });

    test('allows custom operationId override', () => {
      const generator = createOpenApiDocumentGenerator({
        info: { title: 'Test', version: '1.0.0' },
        converters: [mockConverter],
      });

      const routeDefinitions: KoriRouteDefinition[] = [
        {
          method: 'GET',
          path: '/users',
          pluginMeta: openApiMeta({ operationId: 'customListUsers' }),
        },
      ];

      const doc = generator({ routeDefinitions, log: createLoggerStub() });

      expect(doc.paths?.['/users']?.get?.operationId).toBe('customListUsers');
    });
  });

  describe('metadata handling', () => {
    test('includes OpenAPI metadata from route', () => {
      const generator = createOpenApiDocumentGenerator({
        info: { title: 'Test', version: '1.0.0' },
        converters: [mockConverter],
      });

      const routeDefinitions: KoriRouteDefinition[] = [
        {
          method: 'GET',
          path: '/users',
          pluginMeta: openApiMeta({
            summary: 'List users',
            description: 'Get all users',
            tags: ['users'],
            operationId: 'listUsers',
          }),
        },
      ];

      const doc = generator({ routeDefinitions, log: createLoggerStub() });

      expect(doc.paths).toEqual({
        '/users': {
          get: {
            summary: 'List users',
            description: 'Get all users',
            tags: ['users'],
            operationId: 'listUsers',
            parameters: [],
            requestBody: undefined,
            responses: undefined,
          },
        },
      });
    });

    test('excludes routes with exclude flag', () => {
      const generator = createOpenApiDocumentGenerator({
        info: { title: 'Test', version: '1.0.0' },
        converters: [mockConverter],
      });

      const routeDefinitions: KoriRouteDefinition[] = [
        { method: 'GET', path: '/public' },
        {
          method: 'GET',
          path: '/internal',
          pluginMeta: openApiMeta({ exclude: true }),
        },
      ];

      const doc = generator({ routeDefinitions, log: createLoggerStub() });

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

  describe('schema integration', () => {
    test('generates request parameters from schema', () => {
      const converter: SchemaConverter = {
        name: 'test',
        canConvert: () => true,
        convert: () => ({
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID',
              example: '12345',
            },
          },
          required: ['id'],
        }),
      };

      const generator = createOpenApiDocumentGenerator({
        info: { title: 'Test', version: '1.0.0' },
        converters: [converter],
      });

      const routeDefinitions: KoriRouteDefinition[] = [
        {
          method: 'GET',
          path: '/users/:id',
          requestSchema: {
            koriKind: 'kori-request-schema',
            provider: 'test',
            params: createTestSchema(),
          },
        },
      ];

      const doc = generator({ routeDefinitions, log: createLoggerStub() });

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
                example: '12345',
                schema: {
                  type: 'string',
                  description: 'User ID',
                  example: '12345',
                },
              },
            ],
            requestBody: undefined,
            responses: undefined,
          },
        },
      });
    });

    test('generates request body from schema', () => {
      const converter: SchemaConverter = {
        name: 'test',
        canConvert: () => true,
        convert: () => ({
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        }),
      };

      const generator = createOpenApiDocumentGenerator({
        info: { title: 'Test', version: '1.0.0' },
        converters: [converter],
      });

      const routeDefinitions: KoriRouteDefinition[] = [
        {
          method: 'POST',
          path: '/users',
          requestSchema: {
            koriKind: 'kori-request-schema',
            provider: 'test',
            body: createTestSchema(),
          },
        },
      ];

      const doc = generator({ routeDefinitions, log: createLoggerStub() });

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
                    },
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

    test('generates responses from schema', () => {
      const converter: SchemaConverter = {
        name: 'test',
        canConvert: () => true,
        convert: () => ({
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        }),
      };

      const generator = createOpenApiDocumentGenerator({
        info: { title: 'Test', version: '1.0.0' },
        converters: [converter],
      });

      const routeDefinitions: KoriRouteDefinition[] = [
        {
          method: 'GET',
          path: '/users/:id',
          responseSchema: {
            koriKind: 'kori-response-schema',
            provider: 'test',
            responses: {
              '200': createTestSchema(),
            },
          },
        },
      ];

      const doc = generator({ routeDefinitions, log: createLoggerStub() });

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
});
