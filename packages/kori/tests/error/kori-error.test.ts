import { describe, expect, test } from 'vitest';

import { KoriError } from '../../src/error/index.js';

describe('KoriError', () => {
  test('should create error with message and code', () => {
    const error = new KoriError('Something went wrong', { code: 'SOMETHING_WENT_WRONG' });

    expect(error.message).toBe('Something went wrong');
    expect(error.name).toBe('KoriError');
    expect(error.code).toBe('SOMETHING_WENT_WRONG');
    expect(error.data).toBeUndefined();
    expect(error.cause).toBeUndefined();
  });

  test('should create error with all options', () => {
    const cause = new Error('Root cause');
    const data = { step: 'validation', input: 'user-data' };

    const error = new KoriError('Operation failed', {
      code: 'OPERATION_FAILED',
      data,
      cause,
    });

    expect(error.message).toBe('Operation failed');
    expect(error.name).toBe('KoriError');
    expect(error.code).toBe('OPERATION_FAILED');
    expect(error.data).toBe(data);
    expect(error.cause).toBe(cause);
  });

  test('should maintain proper inheritance chain', () => {
    const error = new KoriError('test error', { code: 'TEST_ERROR' });

    expect(error).toBeInstanceOf(Error);
  });
});
