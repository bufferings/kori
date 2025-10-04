import { type SchemaObject } from 'openapi3-ts/oas31';
import { describe, test, expect } from 'vitest';

import { generateRequestParameters } from '../../src/generator/generate-request-parameters.js';
import { createLoggerStub, createTestSchema, createTestRequestSchema } from '../test-helpers.js';

describe('generateRequestParameters', () => {
  describe('general cases', () => {
    test('returns empty array when schema is undefined and path has no parameters', () => {
      const result = generateRequestParameters({
        path: '/users',
        schema: undefined,
        convertSchema: () => {
          expect.fail('convertSchema should not be called');
        },
        log: createLoggerStub(),
      });

      expect(result).toEqual([]);
    });

    test('returns empty array when schema has no parameters and path has no parameters', () => {
      const result = generateRequestParameters({
        path: '/users',
        schema: createTestRequestSchema(),
        convertSchema: () => {
          expect.fail('convertSchema should not be called');
        },
        log: createLoggerStub(),
      });

      expect(result).toEqual([]);
    });
  });

  describe('path parameters', () => {
    test('generates parameters from path when schema is undefined', () => {
      const result = generateRequestParameters({
        path: '/users/{id}',
        schema: undefined,
        convertSchema: () => {
          expect.fail('convertSchema should not be called');
        },
        log: createLoggerStub(),
      });

      expect(result).toEqual([
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ]);
    });

    test('merges path parameters with schema details', () => {
      const paramsSchema = createTestSchema();

      const result = generateRequestParameters({
        path: '/users/{id}/{version}',
        schema: createTestRequestSchema({
          params: paramsSchema,
        }),
        convertSchema: ({ schema }) => {
          if (schema === paramsSchema) {
            return {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'User ID' },
              },
              required: ['id'],
            };
          }
          return undefined;
        },
        log: createLoggerStub(),
      });

      expect(result).toEqual([
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'User ID',
          schema: { type: 'string', description: 'User ID' },
        },
        {
          name: 'version',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ]);
    });

    test('ignores schema properties not in path', () => {
      const paramsSchema = createTestSchema();

      const result = generateRequestParameters({
        path: '/users/{id}',
        schema: createTestRequestSchema({
          params: paramsSchema,
        }),
        convertSchema: ({ schema }) => {
          if (schema === paramsSchema) {
            return {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'User ID' },
                extra: { type: 'string', description: 'Extra param not in path' },
              },
            };
          }
          return undefined;
        },
        log: createLoggerStub(),
      });

      expect(result).toEqual([
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'User ID',
          schema: { type: 'string', description: 'User ID' },
        },
      ]);
    });
  });

  describe('query parameters', () => {
    test('generates query parameters', () => {
      const queriesSchema = createTestSchema();

      const result = generateRequestParameters({
        path: '/users',
        schema: createTestRequestSchema({
          queries: queriesSchema,
        }),
        convertSchema: ({ schema }) => {
          if (schema === queriesSchema) {
            return {
              type: 'object',
              properties: {
                q: { type: 'string', description: 'Search query' },
                limit: { type: 'number' },
              },
            };
          }
          return undefined;
        },
        log: createLoggerStub(),
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        description: 'Search query',
        name: 'q',
        in: 'query',
        required: false,
        schema: { type: 'string', description: 'Search query' },
      });
      expect(result[1]).toEqual({
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'number' },
      });
    });
  });

  describe('header parameters', () => {
    test('generates header parameters', () => {
      const headersSchema = createTestSchema();

      const result = generateRequestParameters({
        path: '/users',
        schema: createTestRequestSchema({
          headers: headersSchema,
        }),
        convertSchema: ({ schema }) => {
          if (schema === headersSchema) {
            return {
              type: 'object',
              properties: {
                'x-api-key': { type: 'string', description: 'API key' },
              },
              required: ['x-api-key'],
            };
          }
          return undefined;
        },
        log: createLoggerStub(),
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        description: 'API key',
        name: 'x-api-key',
        in: 'header',
        required: true,
        schema: { type: 'string', description: 'API key' },
      });
    });
  });

  describe('combining parameters', () => {
    test('combines parameters from all locations', () => {
      const paramsSchema = createTestSchema();
      const queriesSchema = createTestSchema();
      const headersSchema = createTestSchema();

      const result = generateRequestParameters({
        path: '/teams/{teamId}/users/{userId}',
        schema: createTestRequestSchema({
          params: paramsSchema,
          queries: queriesSchema,
          headers: headersSchema,
        }),
        convertSchema: ({ schema }) => {
          if (schema === paramsSchema) {
            return {
              type: 'object',
              properties: {
                teamId: { type: 'string', description: 'Team ID' },
                userId: { type: 'string', description: 'User ID' },
              },
              required: ['teamId', 'userId'],
            } as SchemaObject;
          }
          if (schema === queriesSchema) {
            return {
              type: 'object',
              properties: {
                q: { type: 'string', description: 'Search query' },
                limit: { type: 'number' },
              },
            } as SchemaObject;
          }
          if (schema === headersSchema) {
            return {
              type: 'object',
              properties: {
                'x-api-key': { type: 'string', description: 'API key' },
              },
              required: ['x-api-key'],
            } as SchemaObject;
          }
          return undefined;
        },
        log: createLoggerStub(),
      });

      expect(result).toHaveLength(5);
      expect(result.filter((p) => p.in === 'path')).toHaveLength(2);
      expect(result.filter((p) => p.in === 'query')).toHaveLength(2);
      expect(result.filter((p) => p.in === 'header')).toHaveLength(1);
    });
  });

  describe('unsupported schemas', () => {
    test('returns path parameters when schema conversion is not supported', () => {
      const result = generateRequestParameters({
        path: '/users/{id}',
        schema: createTestRequestSchema({
          params: createTestSchema({ provider: 'unknown' }),
          queries: createTestSchema({ provider: 'unknown' }),
          headers: createTestSchema({ provider: 'unknown' }),
        }),
        convertSchema: () => undefined,
        log: createLoggerStub(),
      });

      expect(result).toEqual([
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ]);
    });

    test('returns path parameters when schema has no properties', () => {
      const result = generateRequestParameters({
        path: '/users/{id}',
        schema: createTestRequestSchema({
          params: createTestSchema(),
          queries: createTestSchema(),
          headers: createTestSchema(),
        }),
        convertSchema: () => ({ type: 'object' }),
        log: createLoggerStub(),
      });

      expect(result).toEqual([
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ]);
    });
  });

  describe('parameter metadata', () => {
    test('copies all metadata from schema to parameter', () => {
      const paramsSchema = createTestSchema();
      const queriesSchema = createTestSchema();
      const headersSchema = createTestSchema();

      const result = generateRequestParameters({
        path: '/users/{id}/{version}',
        schema: createTestRequestSchema({
          params: paramsSchema,
          queries: queriesSchema,
          headers: headersSchema,
        }),
        convertSchema: ({ schema }) => {
          if (schema === paramsSchema) {
            return {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'User ID' },
                version: { type: 'string', example: 'v1' },
              },
            } as SchemaObject;
          }
          if (schema === queriesSchema) {
            return {
              type: 'object',
              properties: {
                q: { type: 'string', examples: ['hello', 'world'] },
                limit: { type: 'number', deprecated: true },
              },
            } as SchemaObject;
          }
          if (schema === headersSchema) {
            return {
              type: 'object',
              properties: {
                'x-api-key': {
                  type: 'string',
                  description: 'API key',
                  example: 'key123',
                  examples: ['key123', 'key456'],
                  deprecated: true,
                },
              },
            } as SchemaObject;
          }
          return undefined;
        },
        log: createLoggerStub(),
      });

      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({
        name: 'id',
        in: 'path',
        required: true,
        description: 'User ID',
        schema: { type: 'string', description: 'User ID' },
      });
      expect(result[1]).toEqual({
        name: 'version',
        in: 'path',
        required: true,
        example: 'v1',
        schema: { type: 'string', example: 'v1' },
      });
      expect(result[2]).toEqual({
        name: 'q',
        in: 'query',
        required: false,
        examples: ['hello', 'world'],
        schema: { type: 'string', examples: ['hello', 'world'] },
      });
      expect(result[3]).toEqual({
        name: 'limit',
        in: 'query',
        required: false,
        deprecated: true,
        schema: { type: 'number', deprecated: true },
      });
      expect(result[4]).toEqual({
        name: 'x-api-key',
        in: 'header',
        required: false,
        description: 'API key',
        example: 'key123',
        examples: ['key123', 'key456'],
        deprecated: true,
        schema: {
          type: 'string',
          description: 'API key',
          example: 'key123',
          examples: ['key123', 'key456'],
          deprecated: true,
        },
      });
    });
  });
});
