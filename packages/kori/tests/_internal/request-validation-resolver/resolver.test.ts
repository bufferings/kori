import { describe, test, expect } from 'vitest';

import { createKoriRequestSchema } from '../../../src/request-schema/index.js';
import { createKoriRequestValidator } from '../../../src/request-validator/index.js';
import { createKoriSchema } from '../../../src/schema/index.js';
import { ok, err } from '../../../src/util/index.js';

import { resolveInternalRequestValidator } from '../../../src/_internal/request-validation-resolver/resolver.js';

const TestProvider = Symbol('test-provider');
const DifferentProvider = Symbol('different-provider');

const testSchema = createKoriSchema({ provider: TestProvider, definition: { type: 'object' } });

const testRequestValidator = createKoriRequestValidator({
  provider: TestProvider,
  validateParams: () => ok({ id: '123', validated: true }),
  validateQueries: () => ok({ page: 1, validated: true }),
  validateHeaders: () => ok({ auth: 'token', validated: true }),
  validateBody: () => ok({ name: 'test', validated: true }),
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
  contentType: () => 'application/json',
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
      expect(result.ok).toBe(true);
      if (!result.ok) {
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
      expect(result.ok).toBe(true);
      if (!result.ok) {
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

  describe('Error aggregation', () => {
    test('aggregates validation errors from multiple components', async () => {
      const requestValidator = createKoriRequestValidator({
        provider: TestProvider,
        validateParams: () => err('params error'),
        validateQueries: () => ok({ page: 1 }),
        validateHeaders: () => err('headers error'),
        validateBody: () => ok({ name: 'test' }),
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
      expect(result.ok).toBe(false);
      if (result.ok) {
        expect.unreachable('for type narrowing');
      }

      expect(result.error).toEqual({
        params: { stage: 'validation', error: 'params error' },
        headers: { stage: 'validation', error: 'headers error' },
      });
      expect(result.error.queries).toBeUndefined();
      expect(result.error.body).toBeUndefined();
    });

    test('returns error when single component fails', async () => {
      const requestValidator = createKoriRequestValidator({
        provider: TestProvider,
        validateParams: () => ok({ id: '123' }),
        validateQueries: () => err('queries error'),
        validateHeaders: () => ok({ auth: 'token' }),
        validateBody: () => ok({ name: 'test' }),
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
      expect(result.ok).toBe(false);
      if (result.ok) {
        expect.unreachable('for type narrowing');
      }

      expect(result.error).toEqual({
        queries: { stage: 'validation', error: 'queries error' },
      });
      expect(result.error.params).toBeUndefined();
      expect(result.error.headers).toBeUndefined();
      expect(result.error.body).toBeUndefined();
    });

    test('handles empty request schema with no validation', async () => {
      const requestValidator = createKoriRequestValidator({
        provider: TestProvider,
        validateParams: () => ok({ id: '123' }),
        validateQueries: () => ok({ page: 1 }),
        validateHeaders: () => ok({ auth: 'token' }),
        validateBody: () => ok({ name: 'test' }),
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
      expect(result.ok).toBe(true);
      if (!result.ok) {
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
        validateParams: () => ok({ id: '123', validated: true }),
        validateQueries: () => ok({ page: 1, validated: true }),
        validateHeaders: () => ok({ auth: 'token', validated: true }),
        validateBody: () => ok({ name: 'test', validated: true }),
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
      expect(result.ok).toBe(false);
      if (result.ok) {
        expect.unreachable('for type narrowing');
      }

      expect(result.error.body).toEqual({
        stage: 'pre-validation',
        type: 'INVALID_BODY',
        message: 'Failed to parse request body',
        cause: expect.any(Error),
      });
    });
  });
});
