import { type SchemaObject } from 'openapi3-ts/oas31';
import { describe, test, expect } from 'vitest';

import { generateResponses } from '../../src/generator/generate-response.js';
import { createLoggerStub, createTestSchema, createTestResponseSchema } from '../test-helpers.js';

describe('generateResponses', () => {
  describe('general cases', () => {
    test('returns undefined when schema is undefined', () => {
      const result = generateResponses({
        schema: undefined,
        convertSchema: () => {
          expect.fail('convertSchema should not be called');
        },
        log: createLoggerStub(),
      });

      expect(result).toBeUndefined();
    });

    test('returns undefined when schema has no responses', () => {
      const result = generateResponses({
        schema: createTestResponseSchema(),
        convertSchema: () => {
          expect.fail('convertSchema should not be called');
        },
        log: createLoggerStub(),
      });

      expect(result).toBeUndefined();
    });

    test('skips undefined response entries', () => {
      const result = generateResponses({
        schema: createTestResponseSchema({
          responses: {
            200: createTestSchema(),
            404: undefined,
          },
        }),
        convertSchema: () => ({ type: 'object', properties: { id: { type: 'string' } } }),
        log: createLoggerStub(),
      });

      expect(result).toEqual({
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { id: { type: 'string' } } },
            },
          },
        },
      });
    });
  });

  describe('simple response', () => {
    test('generates response for simple schema entry', () => {
      const result = generateResponses({
        schema: createTestResponseSchema({
          responses: {
            200: createTestSchema(),
          },
        }),
        convertSchema: () => ({ type: 'object', properties: { id: { type: 'string' } } }),
        log: createLoggerStub(),
      });

      expect(result).toEqual({
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { id: { type: 'string' } } },
            },
          },
        },
      });
    });

    test('skips responses when conversion is not supported', () => {
      const validSchema = createTestSchema();
      const unsupportedSchema = createTestSchema({ provider: 'unknown' });

      const result = generateResponses({
        schema: createTestResponseSchema({
          responses: {
            200: validSchema,
            404: unsupportedSchema,
          },
        }),
        convertSchema: ({ schema }) => {
          if (schema === validSchema) {
            return { type: 'object', properties: { id: { type: 'string' } } };
          }
          return undefined;
        },
        log: createLoggerStub(),
      });

      expect(result).toEqual({
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { id: { type: 'string' } } },
            },
          },
        },
      });
    });

    test('returns undefined when all conversions are not supported', () => {
      const result = generateResponses({
        schema: createTestResponseSchema({
          responses: {
            200: createTestSchema(),
            404: createTestSchema(),
          },
        }),
        convertSchema: () => undefined,
        log: createLoggerStub(),
      });

      expect(result).toBeUndefined();
    });
  });

  describe('content response', () => {
    test('generates response with content entry', () => {
      const bodySchema = createTestSchema();

      const result = generateResponses({
        schema: createTestResponseSchema({
          responses: {
            200: {
              description: 'Success response',
              content: {
                'application/json': bodySchema,
              },
            },
          },
        }),
        convertSchema: ({ schema }) => {
          if (schema === bodySchema) {
            return { type: 'object', properties: { id: { type: 'string' } } };
          }
          return undefined;
        },
        log: createLoggerStub(),
      });

      expect(result).toEqual({
        200: {
          description: 'Success response',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { id: { type: 'string' } } },
            },
          },
        },
      });
    });

    test('generates response with multiple content types', () => {
      const bodySchema = createTestSchema();

      const result = generateResponses({
        schema: createTestResponseSchema({
          responses: {
            200: {
              content: {
                'application/json': bodySchema,
                'application/xml': bodySchema,
              },
            },
          },
        }),
        convertSchema: ({ schema }) => {
          if (schema === bodySchema) {
            return { type: 'object', properties: { id: { type: 'string' } } };
          }
          return undefined;
        },
        log: createLoggerStub(),
      });

      expect(result).toEqual({
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { id: { type: 'string' } } },
            },
            'application/xml': {
              schema: { type: 'object', properties: { id: { type: 'string' } } },
            },
          },
        },
      });
    });

    test('skips content types when conversion is not supported', () => {
      const validSchema = createTestSchema();
      const unsupportedSchema = createTestSchema({ provider: 'unknown' });

      const result = generateResponses({
        schema: createTestResponseSchema({
          responses: {
            200: {
              content: {
                'application/json': validSchema,
                'application/xml': unsupportedSchema,
              },
            },
          },
        }),
        convertSchema: ({ schema }) => {
          if (schema === validSchema) {
            return { type: 'object', properties: { id: { type: 'string' } } };
          }
          return undefined;
        },
        log: createLoggerStub(),
      });

      expect(result).toEqual({
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { id: { type: 'string' } } },
            },
          },
        },
      });
    });

    test('returns undefined when all content types are not supported', () => {
      const result = generateResponses({
        schema: createTestResponseSchema({
          responses: {
            200: {
              content: {
                'application/json': createTestSchema({ provider: 'unknown' }),
                'application/xml': createTestSchema({ provider: 'unknown' }),
              },
            },
          },
        }),
        convertSchema: () => undefined,
        log: createLoggerStub(),
      });

      expect(result).toBeUndefined();
    });
  });

  describe('response headers', () => {
    test('generates response with headers only', () => {
      const headersSchema = createTestSchema();

      const result = generateResponses({
        schema: createTestResponseSchema({
          responses: {
            204: {
              headers: headersSchema,
              content: {},
            },
          },
        }),
        convertSchema: ({ schema }) => {
          if (schema === headersSchema) {
            return {
              type: 'object',
              properties: {
                'x-request-id': { type: 'string', description: 'Request ID' },
              },
              required: ['x-request-id'],
            };
          }
          return undefined;
        },
        log: createLoggerStub(),
      });

      expect(result).toEqual({
        204: {
          description: 'No Content',
          headers: {
            'x-request-id': {
              required: true,
              schema: { type: 'string', description: 'Request ID' },
              description: 'Request ID',
            },
          },
        },
      });
    });

    test('generates response with headers', () => {
      const bodySchema = createTestSchema();
      const headersSchema = createTestSchema();

      const result = generateResponses({
        schema: createTestResponseSchema({
          responses: {
            200: {
              headers: headersSchema,
              content: {
                'application/json': bodySchema,
              },
            },
          },
        }),
        convertSchema: ({ schema }) => {
          if (schema === bodySchema) {
            return { type: 'object', properties: { id: { type: 'string' } } };
          }
          if (schema === headersSchema) {
            return {
              type: 'object',
              properties: {
                'x-request-id': { type: 'string', description: 'Request ID' },
              },
              required: ['x-request-id'],
            } as SchemaObject;
          }
          return undefined;
        },
        log: createLoggerStub(),
      });

      expect(result).toEqual({
        200: {
          description: 'OK',
          headers: {
            'x-request-id': {
              required: true,
              schema: { type: 'string', description: 'Request ID' },
              description: 'Request ID',
            },
          },
          content: {
            'application/json': {
              schema: { type: 'object', properties: { id: { type: 'string' } } },
            },
          },
        },
      });
    });

    test('omits headers when conversion is not supported', () => {
      const bodySchema = createTestSchema();
      const unsupportedHeaders = createTestSchema({ provider: 'unknown' });

      const result = generateResponses({
        schema: createTestResponseSchema({
          responses: {
            200: {
              headers: unsupportedHeaders,
              content: {
                'application/json': bodySchema,
              },
            },
          },
        }),
        convertSchema: ({ schema }) => {
          if (schema === bodySchema) {
            return { type: 'object', properties: { id: { type: 'string' } } };
          }
          return undefined;
        },
        log: createLoggerStub(),
      });

      expect(result).toEqual({
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { id: { type: 'string' } } },
            },
          },
        },
      });
    });

    test('copies all metadata from schema to header', () => {
      const bodySchema = createTestSchema();
      const headersSchema = createTestSchema();

      const result = generateResponses({
        schema: createTestResponseSchema({
          responses: {
            200: {
              headers: headersSchema,
              content: {
                'application/json': bodySchema,
              },
            },
          },
        }),
        convertSchema: ({ schema }) => {
          if (schema === bodySchema) {
            return { type: 'object' };
          }
          if (schema === headersSchema) {
            return {
              type: 'object',
              properties: {
                'x-rate-limit': {
                  type: 'number',
                  description: 'Rate limit',
                  example: 100,
                  examples: [100, 200, 300],
                  deprecated: true,
                },
              },
            } as SchemaObject;
          }
          return undefined;
        },
        log: createLoggerStub(),
      });

      expect(result?.['200'].headers?.['x-rate-limit']).toEqual({
        required: false,
        schema: {
          type: 'number',
          description: 'Rate limit',
          example: 100,
          examples: [100, 200, 300],
          deprecated: true,
        },
        description: 'Rate limit',
        example: 100,
        examples: [100, 200, 300],
        deprecated: true,
      });
    });
  });

  describe('status code descriptions', () => {
    test('generates multiple status codes', () => {
      const bodySchema = createTestSchema();

      const result = generateResponses({
        schema: createTestResponseSchema({
          responses: {
            200: bodySchema,
            404: bodySchema,
          },
        }),
        convertSchema: ({ schema }) => {
          if (schema === bodySchema) {
            return { type: 'object', properties: { id: { type: 'string' } } };
          }
          return undefined;
        },
        log: createLoggerStub(),
      });

      expect(result).toEqual({
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { id: { type: 'string' } } },
            },
          },
        },
        404: {
          description: 'Not Found',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { id: { type: 'string' } } },
            },
          },
        },
      });
    });

    test('uses default description for unknown status codes', () => {
      const result = generateResponses({
        schema: createTestResponseSchema({
          responses: {
            599: createTestSchema(),
          },
        }),
        convertSchema: () => ({ type: 'object', properties: { id: { type: 'string' } } }),
        log: createLoggerStub(),
      });

      expect(result).toEqual({
        599: {
          description: 'Response',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { id: { type: 'string' } } },
            },
          },
        },
      });
    });

    test('prefers custom description over default', () => {
      const bodySchema = createTestSchema();

      const result = generateResponses({
        schema: createTestResponseSchema({
          responses: {
            200: {
              description: 'Custom success',
              content: {
                'application/json': bodySchema,
              },
            },
          },
        }),
        convertSchema: ({ schema }) => {
          if (schema === bodySchema) {
            return { type: 'object', properties: { id: { type: 'string' } } };
          }
          return undefined;
        },
        log: createLoggerStub(),
      });

      expect(result).toEqual({
        200: {
          description: 'Custom success',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { id: { type: 'string' } } },
            },
          },
        },
      });
    });
  });
});
