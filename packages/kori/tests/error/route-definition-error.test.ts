import { describe, expect, test } from 'vitest';

import { KoriError, KoriRouteDefinitionError } from '../../src/error/index.js';

describe('KoriRouteDefinitionError', () => {
  test('should create error with predefined code', () => {
    const error = new KoriRouteDefinitionError('Invalid route definition', {
      method: 'GET',
      path: '/api/:version?/users/:id',
    });

    expect(error.message).toBe('Invalid route definition');
    expect(error.name).toBe('KoriRouteDefinitionError');
    expect(error.code).toBe('ROUTE_DEFINITION_ERROR');
    expect(error.data).toEqual({
      method: 'GET',
      path: '/api/:version?/users/:id',
    });
    expect(error.cause).toBeUndefined();
  });

  test('should maintain proper inheritance chain', () => {
    const error = new KoriRouteDefinitionError('test error', {
      method: 'POST',
      path: '/invalid',
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(KoriError);
  });
});
