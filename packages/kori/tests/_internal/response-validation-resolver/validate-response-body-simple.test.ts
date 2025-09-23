import { describe, test, expect } from 'vitest';

import { createKoriValidator } from '../../../src/index.js';
import { createKoriResponseSchema } from '../../../src/response-schema/index.js';
import { createKoriSchema } from '../../../src/schema/index.js';
import { succeed } from '../../../src/util/index.js';

import { resolveResponseValidator } from '../../../src/_internal/response-validation-resolver/response-validation-resolver.js';

const bodySchema = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'response-body' },
});

const testResponseValidator = createKoriValidator({
  provider: 'test-provider',
  validate: ({ schema, value }) => {
    const schemaType = (schema as any).definition.type;

    if (schemaType === 'response-body') {
      return succeed({ ...(value as any), __test_processed: 'by-response-body-validator' });
    }

    return succeed(value as any);
  },
});

const mockResponse = {
  getStatus: () => 200,
  getMediaType: () => 'application/json',
  getBody: () => ({ data: 'test' }),
  isStream: () => false,
} as any;

describe('resolveResponseValidator - Simple body validation', () => {
  describe('Simple body schema - Direct', () => {
    test('validates simple body with JSON media type', async () => {
      const v = resolveResponseValidator({
        validator: testResponseValidator,
        schema: createKoriResponseSchema({
          provider: 'test-provider',
          responses: {
            '200': bodySchema,
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

      expect(result.value.body).toEqual({ data: 'test', __test_processed: 'by-response-body-validator' });
    });

    test('rejects simple body with non-JSON media type', async () => {
      const v = resolveResponseValidator({
        validator: testResponseValidator,
        schema: createKoriResponseSchema({
          provider: 'test-provider',
          responses: {
            '200': bodySchema,
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

  describe('Simple body schema - Wrapped', () => {
    test('validates wrapped simple body with JSON media type', async () => {
      const v = resolveResponseValidator({
        validator: testResponseValidator,
        schema: createKoriResponseSchema({
          provider: 'test-provider',
          responses: {
            '200': { schema: bodySchema },
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

      expect(result.value.body).toEqual({ data: 'test', __test_processed: 'by-response-body-validator' });
    });

    test('rejects wrapped simple body with non-JSON media type', async () => {
      const v = resolveResponseValidator({
        validator: testResponseValidator,
        schema: createKoriResponseSchema({
          provider: 'test-provider',
          responses: {
            '200': { schema: bodySchema },
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
});
