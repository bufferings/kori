import { describe, test, expect } from 'vitest';

import { createKoriValidator, type KoriRequest } from '../../../src/index.js';
import { createKoriRequestSchema } from '../../../src/request-schema/index.js';
import { createKoriSchema } from '../../../src/schema/index.js';
import { succeed, fail } from '../../../src/util/index.js';

import { resolveRequestValidator } from '../../../src/_internal/request-validation-resolver/request-validation-resolver.js';

const paramsSchema = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'params' },
});

const queriesSchema = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'queries' },
});

const headersSchema = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'headers' },
});

const cookiesSchema = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'cookies' },
});

const bodySchema = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'body' },
});

const testRequestValidator = createKoriValidator({
  provider: 'test-provider',
  validate: ({ schema, value }) => {
    const schemaType = (schema as any).definition.type;

    switch (schemaType) {
      case 'params':
        return succeed({ received: value, __test_processed: 'by-params-validator' } as any);
      case 'queries':
        return succeed({ received: value, __test_processed: 'by-queries-validator' } as any);
      case 'headers':
        return succeed({ received: value, __test_processed: 'by-headers-validator' } as any);
      case 'cookies':
        return succeed({ received: value, __test_processed: 'by-cookies-validator' } as any);
      case 'body':
        return succeed({ received: value, __test_processed: 'by-body-validator' } as any);
      default:
        return fail(`Unknown schema type: ${schemaType}`);
    }
  },
});

const mockRequest = {
  params: () => ({ id: '123' }),
  queries: () => ({ page: '1' }),
  headers: () => ({ authorization: 'Bearer token' }),
  cookies: () => ({ sessionId: 'abc123' }),
  bodyJson: () => Promise.resolve({ name: 'test' }),
  bodyText: () => Promise.resolve('{"name":"test"}'),
  mediaType: () => 'application/json',
} as unknown as KoriRequest;

describe('resolveRequestValidator', () => {
  describe('No validation cases', () => {
    test('returns undefined when validator is not provided', () => {
      const result = resolveRequestValidator({
        validator: undefined,
        schema: createKoriRequestSchema({
          provider: 'test-provider',
          params: paramsSchema,
        }),
      });

      expect(result).toBeUndefined();
    });

    test('returns undefined when schema is not provided', () => {
      const result = resolveRequestValidator({
        validator: testRequestValidator,
        schema: undefined,
      });

      expect(result).toBeUndefined();
    });

    test('throws error when validator and schema have different providers', () => {
      const differentRequestSchema = createKoriRequestSchema({ provider: 'different-provider' });

      expect(() => {
        resolveRequestValidator({
          validator: testRequestValidator,
          schema: differentRequestSchema,
        });
      }).toThrow(
        expect.objectContaining({
          name: 'KoriError',
          code: 'VALIDATION_CONFIG_ERROR',
          message: 'Provider mismatch: validator uses "test-provider" but schema uses "different-provider"',
        }),
      );
    });
  });

  describe('Success cases', () => {
    test('validates request with only params schema defined', async () => {
      const v = resolveRequestValidator({
        validator: testRequestValidator,
        schema: createKoriRequestSchema({
          provider: 'test-provider',
          params: paramsSchema,
        }),
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const result = await v(mockRequest);
      expect(result.success).toBe(true);
      if (!result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value).toEqual({
        params: { received: { id: '123' }, __test_processed: 'by-params-validator' },
        queries: undefined,
        headers: undefined,
        cookies: undefined,
        body: undefined,
      });
    });

    test('validates request with all schemas defined', async () => {
      const v = resolveRequestValidator({
        validator: testRequestValidator,
        schema: createKoriRequestSchema({
          provider: 'test-provider',
          params: paramsSchema,
          queries: queriesSchema,
          headers: headersSchema,
          cookies: cookiesSchema,
          body: bodySchema,
        }),
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const result = await v(mockRequest);
      expect(result.success).toBe(true);
      if (!result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value).toEqual({
        params: { received: { id: '123' }, __test_processed: 'by-params-validator' },
        queries: { received: { page: '1' }, __test_processed: 'by-queries-validator' },
        headers: { received: { authorization: 'Bearer token' }, __test_processed: 'by-headers-validator' },
        cookies: { received: { sessionId: 'abc123' }, __test_processed: 'by-cookies-validator' },
        body: { received: { name: 'test' }, __test_processed: 'by-body-validator' },
      });
    });

    test('handles empty request schema with no validation', async () => {
      const v = resolveRequestValidator({
        validator: testRequestValidator,
        schema: createKoriRequestSchema({
          provider: 'test-provider',
        }),
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const result = await v(mockRequest);
      expect(result.success).toBe(true);
      if (!result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value).toEqual({
        params: undefined,
        queries: undefined,
        headers: undefined,
        cookies: undefined,
        body: undefined,
      });
    });
  });

  describe('Failure cases', () => {
    test('aggregates validation failures from multiple components', async () => {
      const failingValidator = createKoriValidator({
        provider: 'test-provider',
        validate: ({ schema, value }) => {
          const schemaType = (schema as any).definition.type;

          if (schemaType === 'params') {
            return fail('params failure');
          }
          if (schemaType === 'headers') {
            return fail('headers failure');
          }
          return succeed(value as any);
        },
      });

      const v = resolveRequestValidator({
        validator: failingValidator,
        schema: createKoriRequestSchema({
          provider: 'test-provider',
          params: paramsSchema,
          queries: queriesSchema,
          headers: headersSchema,
          cookies: cookiesSchema,
          body: bodySchema,
        }),
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const result = await v(mockRequest);
      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason).toEqual({
        params: { stage: 'validation', reason: 'params failure' },
        headers: { stage: 'validation', reason: 'headers failure' },
      });
      expect(result.reason.queries).toBeUndefined();
      expect(result.reason.cookies).toBeUndefined();
      expect(result.reason.body).toBeUndefined();
    });

    test('returns failure when single component fails', async () => {
      const singleFailValidator = createKoriValidator({
        provider: 'test-provider',
        validate: ({ schema, value }) => {
          const schemaType = (schema as any).definition.type;

          if (schemaType === 'queries') {
            return fail('queries failure');
          }
          return succeed(value as any);
        },
      });

      const v = resolveRequestValidator({
        validator: singleFailValidator,
        schema: createKoriRequestSchema({
          provider: 'test-provider',
          params: paramsSchema,
          queries: queriesSchema,
        }),
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const result = await v(mockRequest);
      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason).toEqual({
        queries: { stage: 'validation', reason: 'queries failure' },
      });
      expect(result.reason.params).toBeUndefined();
      expect(result.reason.headers).toBeUndefined();
      expect(result.reason.cookies).toBeUndefined();
      expect(result.reason.body).toBeUndefined();
    });
  });

  describe('parseType handling', () => {
    const mockBinaryRequest = {
      ...mockRequest,
      mediaType: () => 'application/custom+binary',
      bodyArrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    } as unknown as KoriRequest;

    test('supports explicit parseType: binary', async () => {
      const requestSchema = createKoriRequestSchema({
        provider: 'test-provider',
        body: {
          content: {
            'application/custom+binary': {
              schema: bodySchema,
              parseType: 'binary',
            },
          },
        },
      });

      const v = resolveRequestValidator({
        validator: testRequestValidator,
        schema: requestSchema,
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const result = await v(mockBinaryRequest);
      expect(result.success).toBe(true);
      if (!result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value.body).toEqual({
        mediaType: 'application/custom+binary',
        value: {
          received: expect.any(ArrayBuffer),
          __test_processed: 'by-body-validator',
        },
      });
    });

    test('supports explicit parseType: auto (default)', async () => {
      const jsonRequestSchema = createKoriRequestSchema({
        provider: 'test-provider',
        body: {
          content: {
            'application/json': {
              schema: bodySchema,
              parseType: 'auto',
            },
          },
        },
      });

      const v = resolveRequestValidator({
        validator: testRequestValidator,
        schema: jsonRequestSchema,
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const result = await v(mockRequest);
      expect(result.success).toBe(true);
      if (!result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value.body).toEqual({
        mediaType: 'application/json',
        value: {
          received: { name: 'test' },
          __test_processed: 'by-body-validator',
        },
      });
    });

    test('supports implicit parseType (auto)', async () => {
      const jsonRequestSchema = createKoriRequestSchema({
        provider: 'test-provider',
        body: {
          content: {
            'application/json': bodySchema, // Direct schema, implies auto
          },
        },
      });

      const v = resolveRequestValidator({
        validator: testRequestValidator,
        schema: jsonRequestSchema,
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const result = await v(mockRequest);
      expect(result.success).toBe(true);
      if (!result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value.body).toEqual({
        mediaType: 'application/json',
        value: {
          received: { name: 'test' },
          __test_processed: 'by-body-validator',
        },
      });
    });

    test('supports explicit parseType: text overriding auto detection for JSON', async () => {
      const textRequestSchema = createKoriRequestSchema({
        provider: 'test-provider',
        body: {
          content: {
            'application/json': {
              schema: bodySchema,
              parseType: 'text',
            },
          },
        },
      });

      const v = resolveRequestValidator({
        validator: testRequestValidator,
        schema: textRequestSchema,
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const result = await v(mockRequest);
      expect(result.success).toBe(true);
      if (!result.success) {
        expect.unreachable('for type narrowing');
      }

      // Verify that the body was parsed as text (string)
      expect(result.value.body).toEqual({
        mediaType: 'application/json',
        value: {
          received: '{"name":"test"}',
          __test_processed: 'by-body-validator',
        },
      });
    });
  });
});
