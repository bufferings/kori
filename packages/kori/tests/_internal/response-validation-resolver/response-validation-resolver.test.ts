import { describe, test, expect } from 'vitest';

import { createKoriValidator } from '../../../src/index.js';
import { createKoriResponseSchema } from '../../../src/response-schema/index.js';
import { createKoriSchema } from '../../../src/schema/index.js';
import { succeed, fail } from '../../../src/util/index.js';

import { resolveResponseValidator } from '../../../src/_internal/response-validation-resolver/response-validation-resolver.js';

const testSchema200 = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'status-200' },
});

const testSchema201 = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'status-201' },
});

const testSchema2XX = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'status-2XX' },
});

const testSchemaDefault = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'status-default' },
});

const testResponseValidator = createKoriValidator({
  provider: 'test-provider',
  validate: ({ schema, value }) => {
    const schemaType = (schema as any).definition.type;

    switch (schemaType) {
      case 'status-200':
        return succeed({ ...(value as any), __test_processed: 'by-200-validator' });
      case 'status-201':
        return succeed({ ...(value as any), __test_processed: 'by-201-validator' });
      case 'status-2XX':
        return succeed({ ...(value as any), __test_processed: 'by-2XX-validator' });
      case 'status-default':
        return succeed({ ...(value as any), __test_processed: 'by-default-validator' });
      default:
        return succeed({ ...(value as any), __test_processed: 'by-unknown-validator' });
    }
  },
});

const testResponseSchema = createKoriResponseSchema({
  provider: 'test-provider',
  responses: {
    '200': testSchema200,
    '201': testSchema201,
    '2XX': testSchema2XX,
    default: testSchemaDefault,
  },
});

const mockResponse = {
  getStatus: () => 200,
  getMediaType: () => 'application/json',
  getBody: () => ({ data: 'test' }),
  isStream: () => false,
} as any;

describe('resolveResponseValidator', () => {
  describe('No validation cases', () => {
    test('returns undefined when validator is not provided', () => {
      const result = resolveResponseValidator({
        validator: undefined,
        schema: testResponseSchema,
      });

      expect(result).toBeUndefined();
    });

    test('returns undefined when schema is not provided', () => {
      const result = resolveResponseValidator({
        validator: testResponseValidator,
        schema: undefined,
      });

      expect(result).toBeUndefined();
    });

    test('returns undefined when responses is not provided', () => {
      const result = resolveResponseValidator({
        validator: testResponseValidator,
        schema: createKoriResponseSchema({
          provider: 'test-provider',
        }),
      });

      expect(result).toBeUndefined();
    });

    test('throws error when validator and schema have different providers (with responses)', () => {
      const differentResponseSchema = createKoriResponseSchema({
        provider: 'different-provider',
        responses: {
          '200': createKoriSchema({
            provider: 'different-provider' as const,
            definition: { type: 'object' },
          }),
        },
      });

      expect(() => {
        resolveResponseValidator({
          validator: testResponseValidator,
          schema: differentResponseSchema,
        });
      }).toThrow(
        expect.objectContaining({
          name: 'KoriValidationConfigError',
          message: 'Provider mismatch: validator uses "test-provider" but schema uses "different-provider"',
        }),
      );
    });

    test('throws error when validator and schema have different providers (without responses)', () => {
      const differentResponseSchema = createKoriResponseSchema({
        provider: 'different-provider',
      });

      expect(() => {
        resolveResponseValidator({
          validator: testResponseValidator,
          schema: differentResponseSchema,
        });
      }).toThrow(
        expect.objectContaining({
          name: 'KoriValidationConfigError',
          message: 'Provider mismatch: validator uses "test-provider" but schema uses "different-provider"',
        }),
      );
    });
  });

  describe('Status code resolution', () => {
    test('validates response with exact status code match', async () => {
      const v = resolveResponseValidator({
        validator: testResponseValidator,
        schema: testResponseSchema,
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const result = await v(mockResponse); // Status 200
      expect(result.success).toBe(true);
      if (!result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value).toEqual({
        body: { data: 'test', __test_processed: 'by-200-validator' },
      });
    });

    test('validates response with wildcard status code match', async () => {
      const v = resolveResponseValidator({
        validator: testResponseValidator,
        schema: testResponseSchema,
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const mockRes = {
        ...mockResponse,
        getStatus: () => 204, // Matches 2XX
      };

      const result = await v(mockRes);
      expect(result.success).toBe(true);
      if (!result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value).toEqual({
        body: { data: 'test', __test_processed: 'by-2XX-validator' },
      });
    });

    test('validates response with default status code match', async () => {
      const v = resolveResponseValidator({
        validator: testResponseValidator,
        schema: testResponseSchema,
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const mockRes = {
        ...mockResponse,
        getStatus: () => 404, // No exact or wildcard match, uses default
      };

      const result = await v(mockRes);
      expect(result.success).toBe(true);
      if (!result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value).toEqual({
        body: { data: 'test', __test_processed: 'by-default-validator' },
      });
    });

    test('returns failure when no schema matches status code', async () => {
      const v = resolveResponseValidator({
        validator: testResponseValidator,
        schema: createKoriResponseSchema({
          provider: 'test-provider',
          responses: {
            '200': testSchema200,
          },
        }),
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const mockRes = {
        ...mockResponse,
        getStatus: () => 404, // No match
      };

      const result = await v(mockRes);
      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason).toEqual({
        statusCode: {
          type: 'NO_SCHEMA_FOR_STATUS_CODE',
          message: 'No response schema found for status code',
          statusCode: 404,
        },
      });
      expect(result.reason.body).toBeUndefined();
    });
  });

  describe('Body validation', () => {
    test('handles body validation failure', async () => {
      const failureValidator = createKoriValidator({
        provider: 'test-provider',
        validate: () => fail('validation failure'),
      });

      const v = resolveResponseValidator({
        validator: failureValidator,
        schema: testResponseSchema,
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const result = await v(mockResponse);
      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason).toEqual({
        body: {
          stage: 'validation',
          reason: 'validation failure',
        },
      });
      expect(result.reason.statusCode).toBeUndefined();
    });

    test('skips validation for streaming responses', async () => {
      const v = resolveResponseValidator({
        validator: testResponseValidator,
        schema: testResponseSchema,
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const streamingResponse = {
        ...mockResponse,
        isStream: () => true,
      };

      const result = await v(streamingResponse);
      expect(result.success).toBe(true);
      if (!result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value).toEqual({
        body: undefined, // Streaming responses skip validation
      });
    });
  });
});
