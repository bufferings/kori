import { describe, expect, test } from 'vitest';

import { KoriError, KoriResponseBuildError } from '../../src/error/index.js';

describe('KoriResponseBuildError', () => {
  test('should create error with predefined code', () => {
    const error = new KoriResponseBuildError('Response can only be built once.');

    expect(error.message).toBe('Response can only be built once.');
    expect(error.name).toBe('KoriResponseBuildError');
    expect(error.code).toBe('RESPONSE_BUILD_ERROR');
    expect(error.data).toBeUndefined();
    expect(error.cause).toBeUndefined();
  });

  test('should create error with different message', () => {
    const error = new KoriResponseBuildError('Cannot modify already built response.');

    expect(error.message).toBe('Cannot modify already built response.');
    expect(error.name).toBe('KoriResponseBuildError');
    expect(error.code).toBe('RESPONSE_BUILD_ERROR');
    expect(error.data).toBeUndefined();
    expect(error.cause).toBeUndefined();
  });

  test('should maintain proper inheritance chain', () => {
    const error = new KoriResponseBuildError('test error');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(KoriError);
  });
});
