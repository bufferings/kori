import { describe, test, expect } from 'vitest';

import { generateRequestBody } from '../../src/generator/generate-request-body.js';
import { createLoggerStub, createTestSchema, createTestRequestSchema } from '../test-helpers.js';

describe('generateRequestBody', () => {
  describe('general cases', () => {
    test('returns undefined when schema is undefined', () => {
      const result = generateRequestBody({
        schema: undefined,
        convertSchema: () => {
          expect.fail('convertSchema should not be called');
        },
        log: createLoggerStub(),
      });

      expect(result).toBeUndefined();
    });

    test('returns undefined when no body specified', () => {
      const result = generateRequestBody({
        schema: createTestRequestSchema({}),
        convertSchema: () => {
          expect.fail('convertSchema should not be called');
        },
        log: createLoggerStub(),
      });

      expect(result).toBeUndefined();
    });
  });

  describe('simple body', () => {
    test('generates request body with application/json content type', () => {
      const result = generateRequestBody({
        schema: createTestRequestSchema({
          body: createTestSchema(),
        }),
        convertSchema: () => ({ type: 'object', properties: { name: { type: 'string' } } }),
        log: createLoggerStub(),
      });

      expect(result).toEqual({
        content: {
          'application/json': {
            schema: { type: 'object', properties: { name: { type: 'string' } } },
          },
        },
        required: true,
      });
    });

    test('returns undefined when conversion is not supported', () => {
      const result = generateRequestBody({
        schema: createTestRequestSchema({
          body: createTestSchema(),
        }),
        convertSchema: () => undefined,
        log: createLoggerStub(),
      });

      expect(result).toBeUndefined();
    });
  });

  describe('content body', () => {
    test('generates request body with single media type', () => {
      const result = generateRequestBody({
        schema: createTestRequestSchema({
          body: {
            content: {
              'application/json': createTestSchema(),
            },
          },
        }),
        convertSchema: () => ({ type: 'object', properties: { name: { type: 'string' } } }),
        log: createLoggerStub(),
      });

      expect(result).toEqual({
        content: {
          'application/json': {
            schema: { type: 'object', properties: { name: { type: 'string' } } },
          },
        },
        required: true,
      });
    });

    test('generates request body with multiple media types', () => {
      const result = generateRequestBody({
        schema: createTestRequestSchema({
          body: {
            content: {
              'application/json': createTestSchema(),
              'application/xml': createTestSchema(),
            },
          },
        }),
        convertSchema: () => ({ type: 'object', properties: { name: { type: 'string' } } }),
        log: createLoggerStub(),
      });

      expect(result).toEqual({
        content: {
          'application/json': {
            schema: { type: 'object', properties: { name: { type: 'string' } } },
          },
          'application/xml': {
            schema: { type: 'object', properties: { name: { type: 'string' } } },
          },
        },
        required: true,
      });
    });

    test('skips media types when conversion is not supported', () => {
      const result = generateRequestBody({
        schema: createTestRequestSchema({
          body: {
            content: {
              'application/json': createTestSchema(),
              'application/xml': createTestSchema({ provider: 'unknown' }),
            },
          },
        }),
        convertSchema: ({ schema }) => {
          if (schema.provider === 'unknown') {
            return undefined;
          }
          return { type: 'object', properties: { name: { type: 'string' } } };
        },
        log: createLoggerStub(),
      });

      expect(result).toEqual({
        content: {
          'application/json': {
            schema: { type: 'object', properties: { name: { type: 'string' } } },
          },
        },
        required: true,
      });
    });

    test('returns undefined when all conversions are not supported', () => {
      const result = generateRequestBody({
        schema: createTestRequestSchema({
          body: {
            content: {
              'application/json': createTestSchema({ provider: 'unknown' }),
              'application/xml': createTestSchema({ provider: 'unknown' }),
            },
          },
        }),
        convertSchema: ({ schema }) => {
          if (schema.provider === 'unknown') {
            return undefined;
          }
          return { type: 'object', properties: { name: { type: 'string' } } };
        },
        log: createLoggerStub(),
      });

      expect(result).toBeUndefined();
    });
  });

  describe('content body with description', () => {
    test('includes description when specified', () => {
      const result = generateRequestBody({
        schema: createTestRequestSchema({
          body: {
            description: 'Request payload',
            content: {
              'application/json': createTestSchema(),
            },
          },
        }),
        convertSchema: () => ({ type: 'object', properties: { name: { type: 'string' } } }),
        log: createLoggerStub(),
      });

      expect(result).toEqual({
        description: 'Request payload',
        content: {
          'application/json': {
            schema: { type: 'object', properties: { name: { type: 'string' } } },
          },
        },
        required: true,
      });
    });

    test('returns undefined when all conversions are not supported', () => {
      const result = generateRequestBody({
        schema: createTestRequestSchema({
          body: {
            description: 'Request payload',
            content: {
              'application/json': createTestSchema({ provider: 'unknown' }),
            },
          },
        }),
        convertSchema: ({ schema }) => {
          if (schema.provider === 'unknown') {
            return undefined;
          }
          return { type: 'object', properties: { name: { type: 'string' } } };
        },
        log: createLoggerStub(),
      });

      expect(result).toBeUndefined();
    });
  });

  describe('content body with examples', () => {
    test('copies example from schema to media type', () => {
      const result = generateRequestBody({
        schema: createTestRequestSchema({
          body: createTestSchema(),
        }),
        convertSchema: () => ({
          // Converter returns SchemaObject with example
          type: 'object',
          example: { name: 'John' },
        }),
        log: createLoggerStub(),
      });

      expect(result).toEqual({
        content: {
          'application/json': {
            schema: {
              type: 'object',
              example: { name: 'John' },
            },
            example: { name: 'John' },
          },
        },
        required: true,
      });
    });

    test('copies examples from schema to media type', () => {
      const result = generateRequestBody({
        schema: createTestRequestSchema({
          body: createTestSchema(),
        }),
        convertSchema: () => ({
          // Converter returns SchemaObject with examples
          type: 'object',
          examples: [{ name: 'John' }, { name: 'Jane' }],
        }),
        log: createLoggerStub(),
      });

      expect(result).toEqual({
        content: {
          'application/json': {
            schema: {
              type: 'object',
              examples: [{ name: 'John' }, { name: 'Jane' }],
            },
            examples: [{ name: 'John' }, { name: 'Jane' }],
          },
        },
        required: true,
      });
    });
  });
});
