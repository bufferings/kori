import { describe, test, expect } from 'vitest';

import { createKoriValidator, type KoriRequest } from '../../../src/index.js';
import { createKoriRequestSchema } from '../../../src/request-schema/index.js';
import { createKoriSchema } from '../../../src/schema/index.js';
import { succeed } from '../../../src/util/index.js';

import { resolveRequestValidator } from '../../../src/_internal/request-validation-resolver/request-validation-resolver.js';

const testSchemaJson = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'body-json' },
});

const testSchemaText = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'body-text' },
});

const testSchemaForm = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'body-form' },
});

const testRequestValidator = createKoriValidator({
  provider: 'test-provider',
  validate: ({ schema, value }) => {
    const schemaType = (schema as any).definition.type;
    switch (schemaType) {
      case 'body-json':
        return succeed({ received: value, __test_processed: 'by-json-validator' } as any);
      case 'body-text':
        return succeed({ received: value, __test_processed: 'by-text-validator' } as any);
      case 'body-form':
        return succeed({ received: value, __test_processed: 'by-form-validator' } as any);
      default:
        return succeed({ received: value, __test_processed: 'by-unknown-validator' } as any);
    }
  },
});

const mockRequestBase = {
  params: () => ({ id: '123' }),
  queries: () => ({ page: '1' }),
  headers: () => ({ authorization: 'Bearer token' }),
  cookies: () => ({}),
} as unknown as KoriRequest;

describe('resolveRequestValidator - Content body validation', () => {
  test('validates content body with application/json media type', async () => {
    const v = resolveRequestValidator({
      validator: testRequestValidator,
      schema: createKoriRequestSchema({
        provider: 'test-provider',
        body: {
          content: {
            'application/json': testSchemaJson,
            'text/plain': testSchemaText,
          },
        },
      }),
    });

    expect(v).toBeDefined();
    if (!v) {
      expect.unreachable('for type narrowing');
    }

    const mockReq = {
      ...mockRequestBase,
      mediaType: () => 'application/json',
      bodyJson: () => Promise.resolve({ name: 'test' }),
    };

    const result = await v(mockReq);
    expect(result.success).toBe(true);
    if (!result.success) {
      expect.unreachable('for type narrowing');
    }

    expect(result.value.body).toEqual({
      mediaType: 'application/json',
      value: {
        received: { name: 'test' },
        __test_processed: 'by-json-validator',
      },
    });
  });

  test('validates content body with text/plain media type', async () => {
    const v = resolveRequestValidator({
      validator: testRequestValidator,
      schema: createKoriRequestSchema({
        provider: 'test-provider',
        body: {
          content: {
            'application/json': testSchemaJson,
            'text/plain': testSchemaText,
          },
        },
      }),
    });

    expect(v).toBeDefined();
    if (!v) {
      expect.unreachable('for type narrowing');
    }

    const mockReq = {
      ...mockRequestBase,
      mediaType: () => 'text/plain',
      bodyText: () => Promise.resolve('test-text-content'),
    };

    const result = await v(mockReq);
    expect(result.success).toBe(true);
    if (!result.success) {
      expect.unreachable('for type narrowing');
    }

    expect(result.value.body).toEqual({
      mediaType: 'text/plain',
      value: { received: 'test-text-content', __test_processed: 'by-text-validator' },
    });
  });

  test('validates content body with wildcard match', async () => {
    const v = resolveRequestValidator({
      validator: testRequestValidator,
      schema: createKoriRequestSchema({
        provider: 'test-provider',
        body: {
          content: {
            'application/*': testSchemaJson,
          },
        },
      }),
    });

    expect(v).toBeDefined();
    if (!v) {
      expect.unreachable('for type narrowing');
    }

    const mockReq = {
      ...mockRequestBase,
      mediaType: () => 'application/json',
      bodyJson: () => Promise.resolve({ name: 'test' }),
    };

    const result = await v(mockReq);
    expect(result.success).toBe(true);
    if (!result.success) {
      expect.unreachable('for type narrowing');
    }

    expect(result.value.body).toEqual({
      mediaType: 'application/*',
      value: {
        received: { name: 'test' },
        __test_processed: 'by-json-validator',
      },
    });
  });

  test('validates content body with full wildcard match', async () => {
    const v = resolveRequestValidator({
      validator: testRequestValidator,
      schema: createKoriRequestSchema({
        provider: 'test-provider',
        body: {
          content: {
            '*/*': testSchemaJson,
          },
        },
      }),
    });

    expect(v).toBeDefined();
    if (!v) {
      expect.unreachable('for type narrowing');
    }

    const mockReq = {
      ...mockRequestBase,
      mediaType: () => 'application/json',
      bodyJson: () => Promise.resolve({ name: 'test' }),
    };

    const result = await v(mockReq);
    expect(result.success).toBe(true);
    if (!result.success) {
      expect.unreachable('for type narrowing');
    }

    expect(result.value.body).toEqual({
      mediaType: '*/*',
      value: {
        received: { name: 'test' },
        __test_processed: 'by-json-validator',
      },
    });
  });

  test('rejects content body with unsupported media type', async () => {
    const v = resolveRequestValidator({
      validator: testRequestValidator,
      schema: createKoriRequestSchema({
        provider: 'test-provider',
        body: {
          content: {
            'application/json': testSchemaJson,
          },
        },
      }),
    });

    expect(v).toBeDefined();
    if (!v) {
      expect.unreachable('for type narrowing');
    }

    const mockReq = {
      ...mockRequestBase,
      mediaType: () => 'text/plain',
      bodyText: () => Promise.resolve('test-text-content'),
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

  test('converts FormData to plain object', async () => {
    const v = resolveRequestValidator({
      validator: testRequestValidator,
      schema: createKoriRequestSchema({
        provider: 'test-provider',
        body: {
          content: {
            'multipart/form-data': testSchemaForm,
          },
        },
      }),
    });

    expect(v).toBeDefined();
    if (!v) {
      expect.unreachable('for type narrowing');
    }

    const formData = new FormData();
    formData.append('name', 'Alice');
    formData.append('age', '30');

    const mockReq = {
      ...mockRequestBase,
      mediaType: () => 'multipart/form-data',
      bodyFormData: () => Promise.resolve(formData),
    };

    const result = await v(mockReq);
    expect(result.success).toBe(true);
    if (!result.success) {
      expect.unreachable('for type narrowing');
    }

    expect(result.value.body).toEqual({
      mediaType: 'multipart/form-data',
      value: {
        received: {
          name: 'Alice',
          age: '30',
        },
        __test_processed: 'by-form-validator',
      },
    });
  });

  test('converts repeated keys in FormData to array', async () => {
    const v = resolveRequestValidator({
      validator: testRequestValidator,
      schema: createKoriRequestSchema({
        provider: 'test-provider',
        body: {
          content: {
            'multipart/form-data': testSchemaForm,
          },
        },
      }),
    });

    expect(v).toBeDefined();
    if (!v) {
      expect.unreachable('for type narrowing');
    }

    const formData = new FormData();
    formData.append('tags', 'tag1');
    formData.append('tags', 'tag2');
    formData.append('single', 'value');

    const mockReq = {
      ...mockRequestBase,
      mediaType: () => 'multipart/form-data',
      bodyFormData: () => Promise.resolve(formData),
    };

    const result = await v(mockReq);
    expect(result.success).toBe(true);
    if (!result.success) {
      expect.unreachable('for type narrowing');
    }

    expect(result.value.body).toEqual({
      mediaType: 'multipart/form-data',
      value: {
        received: {
          tags: ['tag1', 'tag2'],
          single: 'value',
        },
        __test_processed: 'by-form-validator',
      },
    });
  });

  test('converts empty FormData to empty object', async () => {
    const v = resolveRequestValidator({
      validator: testRequestValidator,
      schema: createKoriRequestSchema({
        provider: 'test-provider',
        body: {
          content: {
            'multipart/form-data': testSchemaForm,
          },
        },
      }),
    });

    expect(v).toBeDefined();
    if (!v) {
      expect.unreachable('for type narrowing');
    }

    const formData = new FormData();

    const mockReq = {
      ...mockRequestBase,
      mediaType: () => 'multipart/form-data',
      bodyFormData: () => Promise.resolve(formData),
    };

    const result = await v(mockReq);
    expect(result.success).toBe(true);
    if (!result.success) {
      expect.unreachable('for type narrowing');
    }

    expect(result.value.body).toEqual({
      mediaType: 'multipart/form-data',
      value: {
        received: {},
        __test_processed: 'by-form-validator',
      },
    });
  });

  test('converts FormData with File to object containing File', async () => {
    const v = resolveRequestValidator({
      validator: testRequestValidator,
      schema: createKoriRequestSchema({
        provider: 'test-provider',
        body: {
          content: {
            'multipart/form-data': testSchemaForm,
          },
        },
      }),
    });

    expect(v).toBeDefined();
    if (!v) {
      expect.unreachable('for type narrowing');
    }

    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const formData = new FormData();
    formData.append('name', 'Alice');
    formData.append('file', file);

    const mockReq = {
      ...mockRequestBase,
      mediaType: () => 'multipart/form-data',
      bodyFormData: () => Promise.resolve(formData),
    };

    const result = await v(mockReq);
    expect(result.success).toBe(true);
    if (!result.success) {
      expect.unreachable('for type narrowing');
    }

    expect(result.value.body).toMatchObject({
      mediaType: 'multipart/form-data',
      value: {
        received: {
          name: 'Alice',
        },
        __test_processed: 'by-form-validator',
      },
    });
    const received = (result.value.body as { value: { received: Record<string, unknown> } }).value.received;
    expect(received.file).toBeInstanceOf(File);
    expect((received.file as File).name).toBe('test.txt');
  });
});
