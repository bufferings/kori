import { describe, test, expect } from 'vitest';

import { createKoriValidator } from '../../../src/index.js';
import { createKoriResponseSchema } from '../../../src/response-schema/index.js';
import { createKoriSchema } from '../../../src/schema/index.js';
import { succeed } from '../../../src/util/index.js';

import { resolveResponseValidator } from '../../../src/_internal/response-validation-resolver/response-validation-resolver.js';

const jsonSchema = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'response-json' },
});

const plainSchema = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'response-text' },
});

const testResponseValidator = createKoriValidator({
  provider: 'test-provider',
  validate: ({ schema, value }) => {
    const schemaType = (schema as any).definition.type;

    switch (schemaType) {
      case 'response-json':
        return succeed({ ...(value as any), __test_processed: 'by-json-validator' });
      case 'response-text':
        return succeed({ ...(value as any), __test_processed: 'by-text-validator' });
      default:
        return succeed({ ...(value as any), __test_processed: 'by-unknown-validator' });
    }
  },
});

const mockResponse = {
  getStatus: () => 200,
  getMediaType: () => 'application/json',
  getBody: () => ({ data: 'test' }),
  isStream: () => false,
} as any;

describe('resolveResponseValidator - Content body validation', () => {
  test('validates content body with application/json media type', async () => {
    const v = resolveResponseValidator({
      validator: testResponseValidator,
      schema: createKoriResponseSchema({
        provider: 'test-provider',
        responses: {
          '200': {
            content: {
              'application/json': jsonSchema,
              'text/plain': plainSchema,
            },
          },
        },
      }),
    });

    expect(v).toBeDefined();
    if (!v) {
      expect.unreachable('for type narrowing');
    }

    const result = await v(mockResponse);
    expect(result.success).toBe(true);
    if (!result.success) {
      expect.unreachable('for type narrowing');
    }

    expect(result.value.body).toEqual({ data: 'test', __test_processed: 'by-json-validator' });
  });

  test('validates content body with text/plain media type', async () => {
    const v = resolveResponseValidator({
      validator: testResponseValidator,
      schema: createKoriResponseSchema({
        provider: 'test-provider',
        responses: {
          '200': {
            content: {
              'application/json': jsonSchema,
              'text/plain': plainSchema,
            },
          },
        },
      }),
    });

    expect(v).toBeDefined();
    if (!v) {
      expect.unreachable('for type narrowing');
    }

    const mockRes = {
      ...mockResponse,
      getMediaType: () => 'text/plain',
    };

    const result = await v(mockRes);
    expect(result.success).toBe(true);
    if (!result.success) {
      expect.unreachable('for type narrowing');
    }

    expect(result.value.body).toEqual({ data: 'test', __test_processed: 'by-text-validator' });
  });

  test('rejects content body with unsupported media type', async () => {
    const v = resolveResponseValidator({
      validator: testResponseValidator,
      schema: createKoriResponseSchema({
        provider: 'test-provider',
        responses: {
          '200': {
            content: {
              'application/json': jsonSchema,
            },
          },
        },
      }),
    });

    expect(v).toBeDefined();
    if (!v) {
      expect.unreachable('for type narrowing');
    }

    const mockRes = {
      ...mockResponse,
      getMediaType: () => 'text/plain',
    };

    const result = await v(mockRes);
    expect(result.success).toBe(false);
    if (result.success) {
      expect.unreachable('for type narrowing');
    }

    expect(result.reason.body).toEqual({
      stage: 'pre-validation',
      type: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Unsupported Media Type',
      supportedMediaTypes: ['application/json'],
      responseMediaType: 'text/plain',
    });
  });
});
