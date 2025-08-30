import { describe, test, expect, vi } from 'vitest';

import { createKoriRequestSchema } from '../../../src/request-schema/index.js';
import { createKoriRequestValidator } from '../../../src/request-validator/index.js';
import { createKoriSchema } from '../../../src/schema/index.js';
import { ok, err } from '../../../src/util/index.js';

import { resolveInternalRequestValidator } from '../../../src/_internal/request-validation-resolver/resolver.js';

const TestProvider = Symbol('test-provider');
const DifferentProvider = Symbol('different-provider');

describe('resolveInternalRequestValidator', () => {
  test('returns undefined when validator is not provided', () => {
    const requestSchema = createKoriRequestSchema({
      provider: TestProvider,
    });

    const result = resolveInternalRequestValidator({
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

    const result = resolveInternalRequestValidator({
      requestValidator,
      requestSchema: undefined,
    });

    expect(result).toBeUndefined();
  });

  test('throws error when validator and schema have different providers', () => {
    const requestValidator = createKoriRequestValidator({
      provider: TestProvider,
      validateParams: () => ok('test'),
      validateQueries: () => ok('test'),
      validateHeaders: () => ok('test'),
      validateBody: () => ok('test'),
    });

    const requestSchema = createKoriRequestSchema({
      provider: DifferentProvider,
    });

    expect(() => {
      resolveInternalRequestValidator({
        requestValidator,
        requestSchema,
      });
    }).toThrow('Request validator and schema provider mismatch');
  });

  test('validates request with only params schema defined', async () => {
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

    const validateFn = resolveInternalRequestValidator({
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
      contentType: vi.fn(() => 'application/json'),
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

    // Verify only params validation was called since only params schema is defined
    expect(requestValidator.validateParams).toHaveBeenCalledWith({
      schema: paramsSchema,
      params: { id: '123' },
    });
    expect(requestValidator.validateQueries).not.toHaveBeenCalled();
    expect(requestValidator.validateHeaders).not.toHaveBeenCalled();
    expect(requestValidator.validateBody).not.toHaveBeenCalled();
  });

  test('validates request with all schemas defined', async () => {
    const paramsSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });
    const queriesSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });
    const headersSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });
    const bodySchema = createKoriSchema({
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
      queries: queriesSchema,
      headers: headersSchema,
      body: bodySchema,
    });

    const validateFn = resolveInternalRequestValidator({
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
      contentType: vi.fn(() => 'application/json'),
    } as any;

    const result = await validateFn(mockReq);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        params: { id: '123' },
        queries: { page: 1 },
        headers: { auth: 'token' },
        body: { name: 'test' },
      });
    }

    // Verify all validation methods were called
    expect(requestValidator.validateParams).toHaveBeenCalledWith({
      schema: paramsSchema,
      params: { id: '123' },
    });
    expect(requestValidator.validateQueries).toHaveBeenCalledWith({
      schema: queriesSchema,
      queries: { page: '1' },
    });
    expect(requestValidator.validateHeaders).toHaveBeenCalledWith({
      schema: headersSchema,
      headers: { authorization: 'Bearer token' },
    });
    expect(requestValidator.validateBody).toHaveBeenCalledWith({
      schema: bodySchema,
      body: { name: 'test' },
    });
  });

  test('aggregates validation errors from multiple components', async () => {
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

    const validateFn = resolveInternalRequestValidator({
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
      contentType: vi.fn(() => 'application/json'),
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

    // Verify validation methods were called for defined schemas
    expect(requestValidator.validateParams).toHaveBeenCalledWith({
      schema: paramsSchema,
      params: {},
    });
    expect(requestValidator.validateHeaders).toHaveBeenCalledWith({
      schema: headersSchema,
      headers: {},
    });
    expect(requestValidator.validateQueries).not.toHaveBeenCalled();
    expect(requestValidator.validateBody).not.toHaveBeenCalled();
  });

  test('returns success with partial validation errors when some components succeed', async () => {
    const paramsSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });
    const queriesSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'object' },
    });

    const requestValidator = createKoriRequestValidator({
      provider: TestProvider,
      validateParams: vi.fn(() => ok({ id: '123' })),
      validateQueries: vi.fn(() => err('queries error')),
      validateHeaders: vi.fn(() => ok({ auth: 'token' })),
      validateBody: vi.fn(() => ok({ name: 'test' })),
    });

    const requestSchema = createKoriRequestSchema({
      provider: TestProvider,
      params: paramsSchema,
      queries: queriesSchema,
    });

    const validateFn = resolveInternalRequestValidator({
      requestValidator,
      requestSchema,
    });

    expect(validateFn).toBeDefined();
    if (!validateFn) {
      return;
    }

    const mockReq = {
      pathParams: vi.fn(() => ({ id: '123' })),
      queryParams: vi.fn(() => ({ invalid: 'data' })),
      headers: vi.fn(() => ({})),
      parseBody: vi.fn(() => Promise.resolve({})),
      contentType: vi.fn(() => 'application/json'),
    } as any;

    const result = await validateFn(mockReq);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        queries: { stage: 'validation', error: 'queries error' },
      });
      expect(result.error.params).toBeUndefined();
      expect(result.error.headers).toBeUndefined();
      expect(result.error.body).toBeUndefined();
    }
  });

  test('handles empty request schema with no validation', async () => {
    const requestValidator = createKoriRequestValidator({
      provider: TestProvider,
      validateParams: vi.fn(() => ok({ id: '123' })),
      validateQueries: vi.fn(() => ok({ page: 1 })),
      validateHeaders: vi.fn(() => ok({ auth: 'token' })),
      validateBody: vi.fn(() => ok({ name: 'test' })),
    });

    const requestSchema = createKoriRequestSchema({
      provider: TestProvider,
    });

    const validateFn = resolveInternalRequestValidator({
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
      contentType: vi.fn(() => 'application/json'),
    } as any;

    const result = await validateFn(mockReq);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        params: undefined,
        queries: undefined,
        headers: undefined,
        body: undefined,
      });
    }

    // Verify no validation methods were called
    expect(requestValidator.validateParams).not.toHaveBeenCalled();
    expect(requestValidator.validateQueries).not.toHaveBeenCalled();
    expect(requestValidator.validateHeaders).not.toHaveBeenCalled();
    expect(requestValidator.validateBody).not.toHaveBeenCalled();
  });
});
