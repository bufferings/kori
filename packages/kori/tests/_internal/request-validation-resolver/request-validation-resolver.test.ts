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
        return succeed({ ...(value as any), __test_processed: 'by-params-validator' });
      case 'queries':
        return succeed({ ...(value as any), __test_processed: 'by-queries-validator' });
      case 'headers':
        return succeed({ ...(value as any), __test_processed: 'by-headers-validator' });
      case 'body':
        return succeed({ ...(value as any), __test_processed: 'by-body-validator' });
      default:
        return fail(`Unknown schema type: ${schemaType}`);
    }
  },
});

const testRequestSchema = createKoriRequestSchema({
  provider: 'test-provider',
  params: paramsSchema,
  queries: queriesSchema,
  headers: headersSchema,
  body: bodySchema,
});

const mockRequest = {
  params: () => ({ id: '123' }),
  queries: () => ({ page: '1' }),
  headers: () => ({ authorization: 'Bearer token' }),
  parseBody: () => Promise.resolve({ name: 'test' }),
  mediaType: () => 'application/json',
} as unknown as KoriRequest;

describe('resolveRequestValidator', () => {
  describe('No validation cases', () => {
    test('returns undefined when validator is not provided', () => {
      const result = resolveRequestValidator({
        validator: undefined,
        schema: testRequestSchema,
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
          name: 'KoriValidationConfigError',
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
        params: { id: '123', __test_processed: 'by-params-validator' },
        queries: undefined,
        headers: undefined,
        body: undefined,
      });
    });

    test('validates request with all schemas defined', async () => {
      const v = resolveRequestValidator({
        validator: testRequestValidator,
        schema: testRequestSchema,
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
        params: { id: '123', __test_processed: 'by-params-validator' },
        queries: { page: '1', __test_processed: 'by-queries-validator' },
        headers: { authorization: 'Bearer token', __test_processed: 'by-headers-validator' },
        body: { name: 'test', __test_processed: 'by-body-validator' },
      });
    });

    test('handles empty request schema with no validation', async () => {
      const requestSchema = createKoriRequestSchema({
        provider: 'test-provider',
      });

      const v = resolveRequestValidator({
        validator: testRequestValidator,
        schema: requestSchema,
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

      const requestSchema = createKoriRequestSchema({
        provider: 'test-provider',
        params: paramsSchema,
        headers: headersSchema,
      });

      const v = resolveRequestValidator({
        validator: failingValidator,
        schema: requestSchema,
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

      const requestSchema = createKoriRequestSchema({
        provider: 'test-provider',
        params: paramsSchema,
        queries: queriesSchema,
      });

      const v = resolveRequestValidator({
        validator: singleFailValidator,
        schema: requestSchema,
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
      expect(result.reason.body).toBeUndefined();
    });
  });
});
