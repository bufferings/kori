import { describe, test, expect } from 'vitest';

import { createKoriSchema } from '../../src/schema/index.js';
import { succeed } from '../../src/util/index.js';

import {
  createKoriRequestValidator,
  isKoriRequestValidator,
  getKoriRequestValidatorProvider,
} from '../../src/request-validator/validator.js';

const TestProvider = Symbol('test-provider');

describe('createKoriRequestValidator', () => {
  test('creates validator with provider', () => {
    const validator = createKoriRequestValidator({
      provider: TestProvider,
      validateParams: () => succeed('test'),
      validateQueries: () => succeed('test'),
      validateHeaders: () => succeed('test'),
      validateBody: () => succeed('test'),
    });

    expect(getKoriRequestValidatorProvider(validator)).toBe(TestProvider);
  });

  test('rejects schema with different provider at compile time', () => {
    const validator = createKoriRequestValidator({
      provider: TestProvider,
      validateParams: () => succeed('x'),
      validateQueries: () => succeed('x'),
      validateHeaders: () => succeed('x'),
      validateBody: () => succeed('x'),
    });

    const sameProviderSchema = createKoriSchema({
      provider: TestProvider,
      definition: { type: 'string' },
    });
    const OtherProvider = Symbol('other');
    const otherProviderSchema = createKoriSchema({
      provider: OtherProvider,
      definition: { type: 'string' },
    });

    void validator.validateParams({ schema: sameProviderSchema, params: {} });
    // @ts-expect-error schema provider mismatch
    void validator.validateParams({ schema: otherProviderSchema, params: {} });
  });
});

describe('isKoriRequestValidator', () => {
  test('identifies valid validators', () => {
    const validator = createKoriRequestValidator({
      provider: TestProvider,
      validateParams: () => succeed('test'),
      validateQueries: () => succeed('test'),
      validateHeaders: () => succeed('test'),
      validateBody: () => succeed('test'),
    });

    expect(isKoriRequestValidator(validator)).toBe(true);
  });

  test('rejects invalid values', () => {
    expect(isKoriRequestValidator(null)).toBe(false);
    expect(isKoriRequestValidator({})).toBe(false);
  });
});

describe('getKoriRequestValidatorProvider', () => {
  test('returns provider', () => {
    const validator = createKoriRequestValidator({
      provider: TestProvider,
      validateParams: () => succeed('test'),
      validateQueries: () => succeed('test'),
      validateHeaders: () => succeed('test'),
      validateBody: () => succeed('test'),
    });

    expect(getKoriRequestValidatorProvider(validator)).toBe(TestProvider);
  });
});
