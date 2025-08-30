import { describe, test, expect, vi } from 'vitest';

import { createKoriRequestSchema } from '../../../src/request-schema/index.js';
import { createKoriRequestValidator } from '../../../src/request-validator/index.js';
import { createKoriSchema } from '../../../src/schema/index.js';
import { ok, err } from '../../../src/util/index.js';

import { resolveRequestValidationFunction } from '../../../src/_internal/request-validation-resolver/resolver.js';

const TestProvider = Symbol('test-provider');

describe('resolveRequestValidationFunction', () => {
  test('returns undefined when validator is not provided', () => {
    const requestSchema = createKoriRequestSchema({
      provider: TestProvider,
    });

    const result = resolveRequestValidationFunction({
      requestValidator: undefined,
      requestSchema,
    });

    expect(result).toBeUndefined();
  });

  test('returns undefined when schema is not provided', () => {
    const requestValidator = createKoriRequestValidator({
      provider: TestProvider,
      validateParams: () => ok('test'),
      validateQueries: () => ok('test'),
      validateHeaders: () => ok('test'),
      validateBody: () => ok('test'),
    });

    const result = resolveRequestValidationFunction({
      requestValidator,
      requestSchema: undefined,
    });

    expect(result).toBeUndefined();
  });

  test('validates all request components successfully', async () => {
    const paramsSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const requestValidator = createKoriRequestValidator({
      provider: TestProvider,
      validateParams: vi.fn(() => ok({ id: '123' })),
      validateQueries: vi.fn(() => ok({ page: 1 })),
      validateHeaders: vi.fn(() => ok({ auth: 'token' })),
      validateBody: vi.fn(() => ok({ name: 'test' })),
    });

    const requestSchema = createKoriRequestSchema({
      provider: TestProvider,
      params: paramsSchema,
    });

    const validateFn = resolveRequestValidationFunction({
      requestValidator,
      requestSchema,
    });

    expect(validateFn).toBeDefined();
    if (!validateFn) {
      return;
    }

    const mockReq = {
      pathParams: vi.fn(() => ({ id: '123' })),
      queryParams: vi.fn(() => ({ page: '1' })),
      headers: vi.fn(() => ({ authorization: 'Bearer token' })),
      parseBody: vi.fn(() => Promise.resolve({ name: 'test' })),
    } as any;

    const result = await validateFn(mockReq);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        params: { id: '123' },
        queries: undefined, // No queries schema defined
        headers: undefined, // No headers schema defined
        body: undefined, // No body schema defined
      });
    }
  });

  test('aggregates validation errors when validation fails', async () => {
    const paramsSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });
    const headersSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const requestValidator = createKoriRequestValidator({
      provider: TestProvider,
      validateParams: vi.fn(() => err('params error')),
      validateQueries: vi.fn(() => ok({ page: 1 })),
      validateHeaders: vi.fn(() => err('headers error')),
      validateBody: vi.fn(() => ok({ name: 'test' })),
    });

    const requestSchema = createKoriRequestSchema({
      provider: TestProvider,
      params: paramsSchema,
      headers: headersSchema,
    });

    const validateFn = resolveRequestValidationFunction({
      requestValidator,
      requestSchema,
    });

    expect(validateFn).toBeDefined();
    if (!validateFn) {
      return;
    }

    const mockReq = {
      pathParams: vi.fn(() => ({})),
      queryParams: vi.fn(() => ({})),
      headers: vi.fn(() => ({})),
      parseBody: vi.fn(() => Promise.resolve({})),
    } as any;

    const result = await validateFn(mockReq);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        params: { stage: 'validation', error: 'params error' },
        headers: { stage: 'validation', error: 'headers error' },
      });
      expect(result.error.queries).toBeUndefined();
      expect(result.error.body).toBeUndefined();
    }
  });
});
