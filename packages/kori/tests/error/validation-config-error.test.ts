import { describe, expect, test } from 'vitest';

import { KoriError, KoriValidationConfigError } from '../../src/error/index.js';

describe('KoriValidationConfigError', () => {
  test('should create error with predefined code', () => {
    const error = new KoriValidationConfigError('Invalid schema configuration');

    expect(error.message).toBe('Invalid schema configuration');
    expect(error.name).toBe('KoriValidationConfigError');
    expect(error.code).toBe('VALIDATION_CONFIG_ERROR');
    expect(error.data).toBeUndefined();
    expect(error.cause).toBeUndefined();
  });

  test('should create error with data and cause', () => {
    const cause = new Error('Schema parse error');
    const data = { provider: 'zod', field: 'email' };

    const error = new KoriValidationConfigError('Schema validation failed', {
      data,
      cause,
    });

    expect(error.message).toBe('Schema validation failed');
    expect(error.name).toBe('KoriValidationConfigError');
    expect(error.code).toBe('VALIDATION_CONFIG_ERROR');
    expect(error.data).toBe(data);
    expect(error.cause).toBe(cause);
  });

  test('should maintain proper inheritance chain', () => {
    const error = new KoriValidationConfigError('test error');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(KoriError);
  });
});
