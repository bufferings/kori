import { describe, test, expect } from 'vitest';

import { createKoriRequestSchema } from '../../../src/request-schema/index.js';
import { createKoriRequestValidator } from '../../../src/request-validator/index.js';
import { createKoriSchema } from '../../../src/schema/index.js';
import { succeed, fail } from '../../../src/util/index.js';

import { resolveInternalRequestValidator } from '../../../src/_internal/request-validation-resolver/resolver.js';

const TestProvider = Symbol('test-provider');
const DifferentProvider = Symbol('different-provider');

const testSchema = createKoriSchema({ provider: TestProvider, definition: { type: 'object' } });

const testRequestValidator = createKoriRequestValidator({
  provider: TestProvider,
  validateParams: () => succeed({ id: '123', validated: true }),
  validateQueries: () => succeed({ page: 1, validated: true }),
  validateHeaders: () => succeed({ auth: 'token', validated: true }),
  validateBody: () => succeed({ name: 'test', validated: true }),
});

const testRequestSchema = createKoriRequestSchema({
  provider: TestProvider,
  params: testSchema,
  queries: testSchema,
  headers: testSchema,
  body: testSchema,
});

const mockRequest = {
  pathParams: () => ({ id: '123' }),
  queryParams: () => ({ page: '1' }),
  headers: () => ({ authorization: 'Bearer token' }),
  parseBody: () => Promise.resolve({ name: 'test' }),
  mediaType: () => 'application/json',
} as any;

describe('resolveInternalRequestValidator', () => {
  describe('Basic validation', () => {
    test('returns undefined when validator is not provided', () => {
      const result = resolveInternalRequestValidator({
        requestValidator: undefined,
        requestSchema: testRequestSchema,
      });

      expect(result).toBeUndefined();
    });

    test('returns undefined when schema is not provided', () => {
      const result = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: undefined,
      });

      expect(result).toBeUndefined();
    });

    test('throws error when validator is invalid', () => {
      expect(() => {
        resolveInternalRequestValidator({
          requestValidator: {} as any, // Invalid validator
          requestSchema: testRequestSchema,
        });
      }).toThrow(
        expect.objectContaining({
          name: 'KoriValidationConfigError',
          message: expect.stringContaining('Invalid request validator: missing provider information'),
        }),
      );
    });

    test('throws error when schema is invalid', () => {
      expect(() => {
        resolveInternalRequestValidator({
          requestValidator: testRequestValidator,
          requestSchema: {} as any, // Invalid schema
        });
      }).toThrow(
        expect.objectContaining({
          name: 'KoriValidationConfigError',
          message: expect.stringContaining('Invalid request schema: missing provider information'),
        }),
      );
    });

    test('throws error when validator and schema have different providers', () => {
      const differentRequestSchema = createKoriRequestSchema({ provider: DifferentProvider });

      expect(() => {
        resolveInternalRequestValidator({
          requestValidator: testRequestValidator,
          requestSchema: differentRequestSchema,
        });
      }).toThrow(
        expect.objectContaining({
          name: 'KoriValidationConfigError',
          message: expect.stringContaining('Request validator and schema provider mismatch'),
        }),
      );
    });
  });

  describe('Request component validation', () => {
    test('validates request with only params schema defined', async () => {
      const v = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: createKoriRequestSchema({
          provider: TestProvider,
          params: testSchema,
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
        params: { id: '123', validated: true },
        queries: undefined,
        headers: undefined,
        body: undefined,
      });
    });

    test('validates request with all schemas defined', async () => {
      const v = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: testRequestSchema,
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
        params: { id: '123', validated: true },
        queries: { page: 1, validated: true },
        headers: { auth: 'token', validated: true },
        body: { name: 'test', validated: true },
      });
    });
  });

  describe('Failure aggregation', () => {
    test('aggregates validation failures from multiple components', async () => {
      const requestValidator = createKoriRequestValidator({
        provider: TestProvider,
        validateParams: () => fail('params failure'),
        validateQueries: () => succeed({ page: 1 }),
        validateHeaders: () => fail('headers failure'),
        validateBody: () => succeed({ name: 'test' }),
      });

      const requestSchema = createKoriRequestSchema({
        provider: TestProvider,
        params: testSchema,
        headers: testSchema,
      });

      const v = resolveInternalRequestValidator({
        requestValidator,
        requestSchema,
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
      const requestValidator = createKoriRequestValidator({
        provider: TestProvider,
        validateParams: () => succeed({ id: '123' }),
        validateQueries: () => fail('queries failure'),
        validateHeaders: () => succeed({ auth: 'token' }),
        validateBody: () => succeed({ name: 'test' }),
      });

      const requestSchema = createKoriRequestSchema({
        provider: TestProvider,
        params: testSchema,
        queries: testSchema,
      });

      const v = resolveInternalRequestValidator({
        requestValidator,
        requestSchema,
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

    test('handles empty request schema with no validation', async () => {
      const requestValidator = createKoriRequestValidator({
        provider: TestProvider,
        validateParams: () => succeed({ id: '123' }),
        validateQueries: () => succeed({ page: 1 }),
        validateHeaders: () => succeed({ auth: 'token' }),
        validateBody: () => succeed({ name: 'test' }),
      });

      const requestSchema = createKoriRequestSchema({
        provider: TestProvider,
      });

      const v = resolveInternalRequestValidator({
        requestValidator,
        requestSchema,
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

  describe('Body parsing errors', () => {
    test('handles body parsing errors', async () => {
      const requestValidator = createKoriRequestValidator({
        provider: TestProvider,
        validateParams: () => succeed({ id: '123', validated: true }),
        validateQueries: () => succeed({ page: 1, validated: true }),
        validateHeaders: () => succeed({ auth: 'token', validated: true }),
        validateBody: () => succeed({ name: 'test', validated: true }),
      });

      const requestSchema = createKoriRequestSchema({
        provider: TestProvider,
        body: testSchema,
      });

      const v = resolveInternalRequestValidator({
        requestValidator,
        requestSchema,
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
