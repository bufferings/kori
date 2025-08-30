import { describe, test, expect } from 'vitest';

import { createKoriRequestSchema } from '../../../src/request-schema/index.js';
import { createKoriRequestValidator } from '../../../src/request-validator/index.js';
import { createKoriSchema } from '../../../src/schema/index.js';
import { ok } from '../../../src/util/index.js';

import { resolveInternalRequestValidator } from '../../../src/_internal/request-validation-resolver/resolver.js';

const TestProvider = Symbol('test-provider');

const testSchema = createKoriSchema({ provider: TestProvider, definition: { type: 'object' } });
const testSchema2 = createKoriSchema({ provider: TestProvider, definition: { type: 'object' } });

const testRequestValidator = createKoriRequestValidator({
  provider: TestProvider,
  validateParams: () => ok({ id: '123', validated: true }),
  validateQueries: () => ok({ page: 1, validated: true }),
  validateHeaders: () => ok({ auth: 'token', validated: true }),
  validateBody: (input) => {
    if (input.schema === testSchema) {
      return ok({ name: 'test', validated: true });
    } else if (input.schema === testSchema2) {
      return ok({ name: 'test2', validated: true });
    }
    return ok({ name: 'unknown', validated: true });
  },
});

const mockRequest = {
  pathParams: () => ({ id: '123' }),
  queryParams: () => ({ page: '1' }),
  headers: () => ({ authorization: 'Bearer token' }),
  parseBody: () => Promise.resolve({ name: 'test' }),
  contentType: () => 'application/json',
} as any;

describe('resolveInternalRequestValidator - Content body validation', () => {
  describe('Content body schema - Direct', () => {
    test('validates content body with exact media type match', async () => {
      const v = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: createKoriRequestSchema({
          provider: TestProvider,
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
      expect(result.ok).toBe(true);
      if (!result.ok) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value.body).toEqual({
        mediaType: 'application/json',
        value: { name: 'test', validated: true },
      });
    });

    test('validates content body with text/plain media type', async () => {
      const v = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: createKoriRequestSchema({
          provider: TestProvider,
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
        contentType: () => 'text/plain',
      };

      const result = await v(mockReq);
      expect(result.ok).toBe(true);
      if (!result.ok) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value.body).toEqual({
        mediaType: 'text/plain',
        value: { name: 'test2', validated: true },
      });
    });

    test('validates content body with wildcard match', async () => {
      const v = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: createKoriRequestSchema({
          provider: TestProvider,
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
        contentType: () => 'application/xml',
      };

      const result = await v(mockReq);
      expect(result.ok).toBe(true);
      if (!result.ok) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value.body).toEqual({
        mediaType: 'application/*',
        value: { name: 'test', validated: true },
      });
    });

    test('validates content body with full wildcard match', async () => {
      const v = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: createKoriRequestSchema({
          provider: TestProvider,
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
        contentType: () => 'text/csv',
      };

      const result = await v(mockReq);
      expect(result.ok).toBe(true);
      if (!result.ok) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value.body).toEqual({
        mediaType: '*/*',
        value: { name: 'test', validated: true },
      });
    });

    test('rejects content body with unsupported media type', async () => {
      const v = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: createKoriRequestSchema({
          provider: TestProvider,
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
        contentType: () => 'text/plain',
      };

      const result = await v(mockReq);
      expect(result.ok).toBe(false);
      if (result.ok) {
        expect.unreachable('for type narrowing');
      }

      expect(result.error.body).toEqual({
        stage: 'pre-validation',
        type: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported Media Type',
        supportedTypes: ['application/json'],
        requestedType: 'text/plain',
      });
    });
  });

  describe('Content body schema - Wrapped', () => {
    test('validates wrapped content body with exact media type match', async () => {
      const v = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: createKoriRequestSchema({
          provider: TestProvider,
          body: {
            content: {
              'application/json': { schema: testSchema },
              'text/plain': { schema: testSchema2 },
            },
          },
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

      expect(result.value.body).toEqual({
        mediaType: 'application/json',
        value: { name: 'test', validated: true },
      });
    });

    test('validates wrapped content body with text/plain media type', async () => {
      const v = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: createKoriRequestSchema({
          provider: TestProvider,
          body: {
            content: {
              'application/json': { schema: testSchema },
              'text/plain': { schema: testSchema2 },
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
        contentType: () => 'text/plain',
      };

      const result = await v(mockReq);
      expect(result.ok).toBe(true);
      if (!result.ok) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value.body).toEqual({
        mediaType: 'text/plain',
        value: { name: 'test2', validated: true },
      });
    });

    test('validates wrapped content body with wildcard match', async () => {
      const v = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: createKoriRequestSchema({
          provider: TestProvider,
          body: {
            content: {
              'application/*': { schema: testSchema },
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
        contentType: () => 'application/xml',
      };

      const result = await v(mockReq);
      expect(result.ok).toBe(true);
      if (!result.ok) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value.body).toEqual({
        mediaType: 'application/*',
        value: { name: 'test', validated: true },
      });
    });

    test('validates wrapped content body with full wildcard match', async () => {
      const v = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: createKoriRequestSchema({
          provider: TestProvider,
          body: {
            content: {
              '*/*': { schema: testSchema },
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
        contentType: () => 'text/csv',
      };

      const result = await v(mockReq);
      expect(result.ok).toBe(true);
      if (!result.ok) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value.body).toEqual({
        mediaType: '*/*',
        value: { name: 'test', validated: true },
      });
    });

    test('rejects wrapped content body with unsupported media type', async () => {
      const v = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: createKoriRequestSchema({
          provider: TestProvider,
          body: {
            content: {
              'application/json': { schema: testSchema },
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
        contentType: () => 'text/plain',
      };

      const result = await v(mockReq);
      expect(result.ok).toBe(false);
      if (result.ok) {
        expect.unreachable('for type narrowing');
      }

      expect(result.error.body).toEqual({
        stage: 'pre-validation',
        type: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported Media Type',
        supportedTypes: ['application/json'],
        requestedType: 'text/plain',
      });
    });
  });
});
