import { describe, test, expect } from 'vitest';

import { createKoriResponseSchema } from '../../../src/response-schema/index.js';
import { createKoriResponseValidator } from '../../../src/response-validator/index.js';
import { createKoriSchema } from '../../../src/schema/index.js';
import { succeed } from '../../../src/util/index.js';

import { resolveInternalResponseValidator } from '../../../src/_internal/response-validation-resolver/resolver.js';

const TestProvider = Symbol('test-provider');

const testSchema = createKoriSchema({ provider: TestProvider, definition: { type: 'object' } });

const testResponseValidator = createKoriResponseValidator({
  provider: TestProvider,
  validateBody: () => succeed({ message: 'simple body', validated: true }),
});

const mockResponse = {
  getStatus: () => 200,
  getMediaType: () => 'application/json',
  getBody: () => ({ data: 'test' }),
  isStream: () => false,
} as any;

describe('resolveInternalResponseValidator - Simple body validation', () => {
  describe('Simple body schema - Direct', () => {
    test('validates simple body with JSON content-type', async () => {
      const v = resolveInternalResponseValidator({
        responseValidator: testResponseValidator,
        responseSchema: createKoriResponseSchema({
          provider: TestProvider,
          responses: {
            '200': testSchema,
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

      expect(result.value.body).toEqual({ message: 'simple body', validated: true });
    });

    test('rejects simple body with non-JSON content-type', async () => {
      const v = resolveInternalResponseValidator({
        responseValidator: testResponseValidator,
        responseSchema: createKoriResponseSchema({
          provider: TestProvider,
          responses: {
            '200': testSchema,
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
    test('validates wrapped simple body with JSON content-type', async () => {
      const v = resolveInternalResponseValidator({
        responseValidator: testResponseValidator,
        responseSchema: createKoriResponseSchema({
          provider: TestProvider,
          responses: {
            '200': { schema: testSchema },
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

      expect(result.value.body).toEqual({ message: 'simple body', validated: true });
    });

    test('rejects wrapped simple body with non-JSON content-type', async () => {
      const v = resolveInternalResponseValidator({
        responseValidator: testResponseValidator,
        responseSchema: createKoriResponseSchema({
          provider: TestProvider,
          responses: {
            '200': { schema: testSchema },
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
