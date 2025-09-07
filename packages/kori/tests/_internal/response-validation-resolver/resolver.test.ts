import { describe, test, expect } from 'vitest';

import { createKoriResponseSchema } from '../../../src/response-schema/index.js';
import { createKoriResponseValidator } from '../../../src/response-validator/index.js';
import { createKoriSchema } from '../../../src/schema/index.js';
import { succeed, fail } from '../../../src/util/index.js';

import { resolveInternalResponseValidator } from '../../../src/_internal/response-validation-resolver/resolver.js';

const TestProvider = Symbol('test-provider');
const DifferentProvider = Symbol('different-provider');

const testSchema200 = createKoriSchema({ provider: TestProvider, definition: { type: 'object' } });
const testSchema201 = createKoriSchema({ provider: TestProvider, definition: { type: 'object' } });
const testSchema2XX = createKoriSchema({ provider: TestProvider, definition: { type: 'object' } });
const testSchemaDefault = createKoriSchema({ provider: TestProvider, definition: { type: 'object' } });

const testResponseValidator = createKoriResponseValidator({
  provider: TestProvider,
  validateBody: (input) => {
    if (input.schema === testSchema200) {
      return succeed({ status: '200', validated: true });
    } else if (input.schema === testSchema201) {
      return succeed({ status: '201', validated: true });
    } else if (input.schema === testSchema2XX) {
      return succeed({ status: '2XX', validated: true });
    } else if (input.schema === testSchemaDefault) {
      return succeed({ status: 'default', validated: true });
    }
    return succeed({ status: 'unknown', validated: true });
  },
});

const testResponseSchema = createKoriResponseSchema({
  provider: TestProvider,
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

describe('resolveInternalResponseValidator', () => {
  describe('Basic validation', () => {
    test('returns undefined when validator is not provided', () => {
      const result = resolveInternalResponseValidator({
        responseValidator: undefined,
        responseSchema: testResponseSchema,
      });

      expect(result).toBeUndefined();
    });

    test('returns undefined when schema is not provided', () => {
      const result = resolveInternalResponseValidator({
        responseValidator: testResponseValidator,
        responseSchema: undefined,
      });

      expect(result).toBeUndefined();
    });

    test('throws error when validator is invalid', () => {
      expect(() => {
        resolveInternalResponseValidator({
          responseValidator: {} as any, // Invalid validator
          responseSchema: testResponseSchema,
        });
      }).toThrow(
        expect.objectContaining({
          name: 'KoriValidationConfigError',
          message: expect.stringContaining('Invalid response validator: missing provider information'),
        }),
      );
    });

    test('throws error when schema is invalid', () => {
      expect(() => {
        resolveInternalResponseValidator({
          responseValidator: testResponseValidator,
          responseSchema: {} as any, // Invalid schema
        });
      }).toThrow(
        expect.objectContaining({
          name: 'KoriValidationConfigError',
          message: expect.stringContaining('Invalid response schema: missing provider information'),
        }),
      );
    });

    test('throws error when validator and schema have different providers', () => {
      const differentResponseSchema = createKoriResponseSchema({
        provider: DifferentProvider,
        responses: { '200': createKoriSchema({ provider: DifferentProvider, definition: { type: 'object' } }) },
      });

      expect(() => {
        resolveInternalResponseValidator({
          responseValidator: testResponseValidator,
          responseSchema: differentResponseSchema,
        });
      }).toThrow(
        expect.objectContaining({
          name: 'KoriValidationConfigError',
          message: expect.stringContaining('Response validator and schema provider mismatch'),
        }),
      );
    });
  });

  describe('Status code resolution', () => {
    test('validates response with exact status code match', async () => {
      const v = resolveInternalResponseValidator({
        responseValidator: testResponseValidator,
        responseSchema: testResponseSchema,
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
        body: { status: '200', validated: true },
      });
    });

    test('validates response with wildcard status code match', async () => {
      const v = resolveInternalResponseValidator({
        responseValidator: testResponseValidator,
        responseSchema: testResponseSchema,
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
        body: { status: '2XX', validated: true },
      });
    });

    test('validates response with default status code match', async () => {
      const v = resolveInternalResponseValidator({
        responseValidator: testResponseValidator,
        responseSchema: testResponseSchema,
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
        body: { status: 'default', validated: true },
      });
    });

    test('returns failure when no schema matches status code', async () => {
      const v = resolveInternalResponseValidator({
        responseValidator: testResponseValidator,
        responseSchema: createKoriResponseSchema({
          provider: TestProvider,
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
    test('aggregates body validation failures', async () => {
      const failureValidator = createKoriResponseValidator({
        provider: TestProvider,
        validateBody: () => fail('validation failure'),
      });

      const v = resolveInternalResponseValidator({
        responseValidator: failureValidator,
        responseSchema: testResponseSchema,
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

    test('handles streaming responses', async () => {
      const v = resolveInternalResponseValidator({
        responseValidator: testResponseValidator,
        responseSchema: testResponseSchema,
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
