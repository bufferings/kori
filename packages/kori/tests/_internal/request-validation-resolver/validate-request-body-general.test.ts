import { describe, test, expect } from 'vitest';

import { createKoriValidator, type KoriRequest } from '../../../src/index.js';
import { createKoriRequestSchema } from '../../../src/request-schema/index.js';
import { createKoriSchema } from '../../../src/schema/index.js';
import { succeed } from '../../../src/util/index.js';

import { resolveRequestValidator } from '../../../src/_internal/request-validation-resolver/request-validation-resolver.js';

const bodySchema = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'body' },
});

const testRequestValidator = createKoriValidator({
  provider: 'test-provider',
  validate: ({ schema, value }) => {
    const schemaType = (schema as any).definition.type;

    if (schemaType === 'body') {
      return succeed({ ...(value as any), __test_processed: 'by-body-validator' });
    }

    return succeed(value as any);
  },
});

const mockRequest = {
  params: () => ({ id: '123' }),
  queries: () => ({ page: '1' }),
  headers: () => ({ authorization: 'Bearer token' }),
  parseBody: () => Promise.resolve({ name: 'test' }),
  mediaType: () => 'application/json',
} as unknown as KoriRequest;

describe('resolveRequestValidator - General body validation', () => {
  describe('Missing media type', () => {
    test('rejects body validation with undefined media type', async () => {
      const v = resolveRequestValidator({
        validator: testRequestValidator,
        schema: createKoriRequestSchema({
          provider: 'test-provider',
          body: bodySchema,
        }),
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const mockReq = {
        ...mockRequest,
        mediaType: () => undefined,
      };

      const result = await v(mockReq);
      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.body).toEqual({
        stage: 'pre-validation',
        type: 'MISSING_CONTENT_TYPE',
        message: 'content-type header is required',
      });
    });
  });

  describe('Body parsing errors', () => {
    test('handles body parsing errors', async () => {
      const requestSchema = createKoriRequestSchema({
        provider: 'test-provider',
        body: bodySchema,
      });

      const v = resolveRequestValidator({
        validator: testRequestValidator,
        schema: requestSchema,
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const mockReq = {
        ...mockRequest,
        parseBody: () => Promise.reject(new Error('Invalid JSON')),
      };

      const result = await v(mockReq);
      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.body).toEqual({
        stage: 'pre-validation',
        type: 'INVALID_BODY',
        message: 'Failed to parse request body',
        cause: expect.any(Error),
      });
    });
  });
});
