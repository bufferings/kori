import { describe, test, expect } from 'vitest';

import { createKoriValidator, type KoriRequest } from '../../../src/index.js';
import { createKoriRequestSchema } from '../../../src/request-schema/index.js';
import { createKoriSchema } from '../../../src/schema/index.js';
import { succeed } from '../../../src/util/index.js';

import { resolveRequestValidator } from '../../../src/_internal/request-validation-resolver/request-validation-resolver.js';

const testSchema = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'body-json' },
});

const testSchema2 = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'body-text' },
});

const testRequestValidator = createKoriValidator({
  provider: 'test-provider',
  validate: ({ schema, value }) => {
    const schemaType = (schema as any).definition.type;

    switch (schemaType) {
      case 'body-json':
        return succeed({ ...(value as any), __test_processed: 'by-json-validator' });
      case 'body-text':
        return succeed({ ...(value as any), __test_processed: 'by-text-validator' });
      default:
        return succeed({ ...(value as any), __test_processed: 'by-unknown-validator' });
    }
  },
});

const mockRequest = {
  params: () => ({ id: '123' }),
  queries: () => ({ page: '1' }),
  headers: () => ({ authorization: 'Bearer token' }),
  parseBody: () => Promise.resolve({ name: 'test' }),
  mediaType: () => 'application/json',
} as unknown as KoriRequest;

describe('resolveRequestValidator - Content body validation', () => {
  test('validates content body with application/json media type', async () => {
    const v = resolveRequestValidator({
      validator: testRequestValidator,
      schema: createKoriRequestSchema({
        provider: 'test-provider',
        body: {
          content: {
            'application/json': testSchema,
            'text/plain': testSchema2,
          },
        },
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

    expect(result.value.body).toEqual({
      mediaType: 'application/json',
      value: { name: 'test', __test_processed: 'by-json-validator' },
    });
  });

  test('validates content body with text/plain media type', async () => {
    const v = resolveRequestValidator({
      validator: testRequestValidator,
      schema: createKoriRequestSchema({
        provider: 'test-provider',
        body: {
          content: {
            'application/json': testSchema,
            'text/plain': testSchema2,
          },
        },
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
    expect(result.success).toBe(true);
    if (!result.success) {
      expect.unreachable('for type narrowing');
    }

    expect(result.value.body).toEqual({
      mediaType: 'text/plain',
      value: { name: 'test', __test_processed: 'by-text-validator' },
    });
  });

  test('validates content body with wildcard match', async () => {
    const v = resolveRequestValidator({
      validator: testRequestValidator,
      schema: createKoriRequestSchema({
        provider: 'test-provider',
        body: {
          content: {
            'application/*': testSchema,
          },
        },
      }),
    });

    expect(v).toBeDefined();
    if (!v) {
      expect.unreachable('for type narrowing');
    }

    const mockReq = {
      ...mockRequest,
      mediaType: () => 'application/json',
    };

    const result = await v(mockReq);
    expect(result.success).toBe(true);
    if (!result.success) {
      expect.unreachable('for type narrowing');
    }

    expect(result.value.body).toEqual({
      mediaType: 'application/*',
      value: { name: 'test', __test_processed: 'by-json-validator' },
    });
  });

  test('validates content body with full wildcard match', async () => {
    const v = resolveRequestValidator({
      validator: testRequestValidator,
      schema: createKoriRequestSchema({
        provider: 'test-provider',
        body: {
          content: {
            '*/*': testSchema,
          },
        },
      }),
    });

    expect(v).toBeDefined();
    if (!v) {
      expect.unreachable('for type narrowing');
    }

    const mockReq = {
      ...mockRequest,
      mediaType: () => 'application/json',
    };

    const result = await v(mockReq);
    expect(result.success).toBe(true);
    if (!result.success) {
      expect.unreachable('for type narrowing');
    }

    expect(result.value.body).toEqual({
      mediaType: '*/*',
      value: { name: 'test', __test_processed: 'by-json-validator' },
    });
  });

  test('rejects content body with unsupported media type', async () => {
    const v = resolveRequestValidator({
      validator: testRequestValidator,
      schema: createKoriRequestSchema({
        provider: 'test-provider',
        body: {
          content: {
            'application/json': testSchema,
          },
        },
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
