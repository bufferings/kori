import { describe, test, expect } from 'vitest';

import { createKoriRequestSchema } from '../../../src/request-schema/index.js';
import { createKoriRequestValidator } from '../../../src/request-validator/index.js';
import { createKoriSchema } from '../../../src/schema/index.js';
import { succeed } from '../../../src/util/index.js';

import { resolveInternalRequestValidator } from '../../../src/_internal/request-validation-resolver/resolver.js';

const TestProvider = Symbol('test-provider');

const testSchema = createKoriSchema({ provider: TestProvider, definition: { type: 'object' } });

const testRequestValidator = createKoriRequestValidator({
  provider: TestProvider,
  validateParams: () => succeed({ id: '123', validated: true }),
  validateQueries: () => succeed({ page: 1, validated: true }),
  validateHeaders: () => succeed({ auth: 'token', validated: true }),
  validateBody: () => succeed({ name: 'test', validated: true }),
});

const mockRequest = {
  pathParams: () => ({ id: '123' }),
  queryParams: () => ({ page: '1' }),
  headers: () => ({ authorization: 'Bearer token' }),
  parseBody: () => Promise.resolve({ name: 'test' }),
  mediaType: () => 'application/json',
} as any;

describe('resolveInternalRequestValidator - Simple body validation', () => {
  describe('Simple body schema - Direct', () => {
    test('validates simple body with default content-type', async () => {
      const v = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: createKoriRequestSchema({
          provider: TestProvider,
          body: testSchema,
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

      expect(result.value.body).toEqual({ name: 'test', validated: true });
    });

    test('rejects simple body with non-JSON content-type', async () => {
      const v = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: createKoriRequestSchema({
          provider: TestProvider,
          body: testSchema,
        }),
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const mockReq = {
        ...mockRequest,
        mediaType: () => 'text/plain',
      };

      const result = await v(mockReq);
      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.body).toEqual({
        stage: 'pre-validation',
        type: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported Media Type',
        supportedMediaTypes: ['application/json'],
        requestMediaType: 'text/plain',
      });
    });
  });

  describe('Simple body schema - Wrapped', () => {
    test('validates wrapped simple body with default content-type', async () => {
      const v = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: createKoriRequestSchema({
          provider: TestProvider,
          body: { schema: testSchema },
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

      expect(result.value.body).toEqual({ name: 'test', validated: true });
    });

    test('rejects wrapped simple body with non-JSON content-type', async () => {
      const v = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: createKoriRequestSchema({
          provider: TestProvider,
          body: { schema: testSchema },
        }),
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const mockReq = {
        ...mockRequest,
        mediaType: () => 'text/plain',
      };

      const result = await v(mockReq);
      expect(result.success).toBe(false);
      if (result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.reason.body).toEqual({
        stage: 'pre-validation',
        type: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported Media Type',
        supportedMediaTypes: ['application/json'],
        requestMediaType: 'text/plain',
      });
    });
  });
});
