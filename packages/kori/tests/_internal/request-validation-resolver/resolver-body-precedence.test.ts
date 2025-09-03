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

describe('resolveInternalRequestValidator - Media type precedence', () => {
  describe('Media type matching priority', () => {
    test('prefers exact match over subtype wildcard', async () => {
      const v = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: createKoriRequestSchema({
          provider: TestProvider,
          body: {
            content: {
              'application/json': testSchema, // Exact match
              'application/*': testSchema2, // Should not be used
            },
          },
        }),
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const result = await v(mockRequest); // application/json
      expect(result.ok).toBe(true);
      if (!result.ok) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value.body).toEqual({
        mediaType: 'application/json',
        value: { name: 'test', validated: true }, // testSchema was used
      });
    });

    test('prefers subtype wildcard over full wildcard', async () => {
      const v = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: createKoriRequestSchema({
          provider: TestProvider,
          body: {
            content: {
              'application/*': testSchema, // Should be used
              '*/*': testSchema2, // Should not be used
            },
          },
        }),
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const result = await v(mockRequest); // application/json
      expect(result.ok).toBe(true);
      if (!result.ok) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value.body).toEqual({
        mediaType: 'application/*',
        value: { name: 'test', validated: true }, // testSchema was used
      });
    });

    test('uses full wildcard when no other matches', async () => {
      const v = resolveInternalRequestValidator({
        requestValidator: testRequestValidator,
        requestSchema: createKoriRequestSchema({
          provider: TestProvider,
          body: {
            content: {
              'text/*': testSchema2, // Does not match
              '*/*': testSchema, // Should be used
            },
          },
        }),
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const result = await v(mockRequest); // application/json
      expect(result.ok).toBe(true);
      if (!result.ok) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value.body).toEqual({
        mediaType: '*/*',
        value: { name: 'test', validated: true }, // testSchema was used
      });
    });
  });
});
