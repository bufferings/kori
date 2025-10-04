import { describe, test, expect } from 'vitest';

import { openApiMeta, OpenApiPluginMetaKey } from '../../src/plugin/openapi-plugin-meta.js';

describe('openApiMeta', () => {
  test('stores metadata under symbol key', () => {
    const result = openApiMeta({
      summary: 'Get user',
      description: 'Retrieves a user by ID',
      tags: ['users', 'public'],
      operationId: 'getUser',
      exclude: false,
    });

    expect(result).toEqual({
      [OpenApiPluginMetaKey]: {
        summary: 'Get user',
        description: 'Retrieves a user by ID',
        tags: ['users', 'public'],
        operationId: 'getUser',
        exclude: false,
      },
    });
  });
});
