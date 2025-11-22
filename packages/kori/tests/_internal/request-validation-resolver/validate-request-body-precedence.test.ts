import { describe, test, expect } from 'vitest';

import { createKoriValidator, type KoriRequest } from '../../../src/index.js';
import { createKoriRequestSchema } from '../../../src/request-schema/index.js';
import { createKoriSchema } from '../../../src/schema/index.js';
import { succeed } from '../../../src/util/index.js';

import { resolveRequestValidator } from '../../../src/_internal/request-validation-resolver/request-validation-resolver.js';

const exactMatchSchema = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'exact-match' },
});

const wildcardSchema = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'wildcard-match' },
});

const fullWildcardSchema = createKoriSchema({
  provider: 'test-provider',
  definition: { type: 'full-wildcard-match' },
});

const testRequestValidator = createKoriValidator({
  provider: 'test-provider',
  validate: ({ schema, value }) => {
    const schemaType = (schema as any).definition.type;

    switch (schemaType) {
      case 'exact-match':
        return succeed({ ...(value as any), __test_processed: 'by-exact-match-validator' });
      case 'wildcard-match':
        return succeed({ ...(value as any), __test_processed: 'by-wildcard-match-validator' });
      case 'full-wildcard-match':
        return succeed({ ...(value as any), __test_processed: 'by-full-wildcard-validator' });
      default:
        return succeed({ ...(value as any), __test_processed: 'by-unknown-validator' });
    }
  },
});

const mockRequest = {
  params: () => ({ id: '123' }),
  queries: () => ({ page: '1' }),
  headers: () => ({ authorization: 'Bearer token' }),
  bodyJson: () => Promise.resolve({ name: 'test' }),
  mediaType: () => 'application/json',
} as unknown as KoriRequest;

describe('resolveRequestValidator - Media type precedence', () => {
  describe('Media type matching priority', () => {
    test('prefers exact match over subtype wildcard', async () => {
      const v = resolveRequestValidator({
        validator: testRequestValidator,
        schema: createKoriRequestSchema({
          provider: 'test-provider',
          body: {
            content: {
              'application/json': exactMatchSchema, // Exact match
              'application/*': wildcardSchema, // Should not be used
            },
          },
        }),
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const result = await v(mockRequest); // application/json
      expect(result.success).toBe(true);
      if (!result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value.body).toEqual({
        mediaType: 'application/json',
        value: { name: 'test', __test_processed: 'by-exact-match-validator' }, // exactMatchSchema was used
      });
    });

    test('prefers subtype wildcard over full wildcard', async () => {
      const v = resolveRequestValidator({
        validator: testRequestValidator,
        schema: createKoriRequestSchema({
          provider: 'test-provider',
          body: {
            content: {
              'application/*': wildcardSchema, // Should be used
              '*/*': fullWildcardSchema, // Should not be used
            },
          },
        }),
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const result = await v(mockRequest); // application/json
      expect(result.success).toBe(true);
      if (!result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value.body).toEqual({
        mediaType: 'application/*',
        value: { name: 'test', __test_processed: 'by-wildcard-match-validator' }, // wildcardSchema was used
      });
    });

    test('uses full wildcard when no other matches', async () => {
      const v = resolveRequestValidator({
        validator: testRequestValidator,
        schema: createKoriRequestSchema({
          provider: 'test-provider',
          body: {
            content: {
              'text/*': wildcardSchema, // Does not match
              '*/*': fullWildcardSchema, // Should be used
            },
          },
        }),
      });

      expect(v).toBeDefined();
      if (!v) {
        expect.unreachable('for type narrowing');
      }

      const result = await v(mockRequest); // application/json
      expect(result.success).toBe(true);
      if (!result.success) {
        expect.unreachable('for type narrowing');
      }

      expect(result.value.body).toEqual({
        mediaType: '*/*',
        value: { name: 'test', __test_processed: 'by-full-wildcard-validator' }, // fullWildcardSchema was used
      });
    });
  });
});
