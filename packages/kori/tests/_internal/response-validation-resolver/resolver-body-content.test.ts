import { describe, test, expect } from 'vitest';

import { createKoriResponseSchema } from '../../../src/response-schema/index.js';
import { createKoriResponseValidator } from '../../../src/response-validator/index.js';
import { createKoriSchema } from '../../../src/schema/index.js';
import { succeed } from '../../../src/util/index.js';

import { resolveInternalResponseValidator } from '../../../src/_internal/response-validation-resolver/resolver.js';

const TestProvider = Symbol('test-provider');

const testSchema = createKoriSchema({ provider: TestProvider, definition: { type: 'object' } });
const testSchema2 = createKoriSchema({ provider: TestProvider, definition: { type: 'object' } });

const testResponseValidator = createKoriResponseValidator({
  provider: TestProvider,
  validateBody: (input) => {
    if (input.schema === testSchema) {
      return succeed({ content: 'json', validated: true });
    } else if (input.schema === testSchema2) {
      return succeed({ content: 'plain', validated: true });
    }
    return succeed({ content: 'unknown', validated: true });
  },
});

const mockResponse = {
  getStatus: () => 200,
  getMediaType: () => 'application/json',
  getBody: () => ({ data: 'test' }),
  isStream: () => false,
} as any;

describe('resolveInternalResponseValidator - Content body validation', () => {
  describe('Content body schema - Direct', () => {
    test('validates content body with JSON media type', async () => {
      const v = resolveInternalResponseValidator({
        responseValidator: testResponseValidator,
        responseSchema: createKoriResponseSchema({
          provider: TestProvider,
          responses: {
            '200': {
              content: {
                'application/json': testSchema,
                'text/plain': testSchema2,
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

      expect(result.value.body).toEqual({ content: 'json', validated: true });
    });

    test('validates content body with text/plain media type', async () => {
      const v = resolveInternalResponseValidator({
        responseValidator: testResponseValidator,
        responseSchema: createKoriResponseSchema({
          provider: TestProvider,
          responses: {
            '200': {
              content: {
                'application/json': testSchema,
                'text/plain': testSchema2,
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

      expect(result.value.body).toEqual({ content: 'plain', validated: true });
    });

    test('rejects content body with unsupported media type', async () => {
      const v = resolveInternalResponseValidator({
        responseValidator: testResponseValidator,
        responseSchema: createKoriResponseSchema({
          provider: TestProvider,
          responses: {
            '200': {
              content: {
                'application/json': testSchema,
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

  describe('Content body schema - Wrapped', () => {
    test('validates wrapped content body with JSON media type', async () => {
      const v = resolveInternalResponseValidator({
        responseValidator: testResponseValidator,
        responseSchema: createKoriResponseSchema({
          provider: TestProvider,
          responses: {
            '200': {
              content: {
                'application/json': { schema: testSchema },
                'text/plain': { schema: testSchema2 },
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

      expect(result.value.body).toEqual({ content: 'json', validated: true });
    });

    test('validates wrapped content body with text/plain media type', async () => {
      const v = resolveInternalResponseValidator({
        responseValidator: testResponseValidator,
        responseSchema: createKoriResponseSchema({
          provider: TestProvider,
          responses: {
            '200': {
              content: {
                'application/json': { schema: testSchema },
                'text/plain': { schema: testSchema2 },
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

      expect(result.value.body).toEqual({ content: 'plain', validated: true });
    });

    test('rejects wrapped content body with unsupported media type', async () => {
      const v = resolveInternalResponseValidator({
        responseValidator: testResponseValidator,
        responseSchema: createKoriResponseSchema({
          provider: TestProvider,
          responses: {
            '200': {
              content: {
                'application/json': { schema: testSchema },
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
});
