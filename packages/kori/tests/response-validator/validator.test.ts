import { describe, test, expect } from 'vitest';

import { createKoriSchema } from '../../src/schema/index.js';
import { ok } from '../../src/util/index.js';

import {
  createKoriResponseValidator,
  isKoriResponseValidator,
  getKoriResponseValidatorProvider,
} from '../../src/response-validator/validator.js';

const TestProvider = Symbol('test-provider');

describe('createKoriResponseValidator', () => {
  test('creates validator with provider', () => {
    const validator = createKoriResponseValidator({
      provider: TestProvider,
      validateBody: () => ok('test'),
    });

    expect(getKoriResponseValidatorProvider(validator)).toBe(TestProvider);
  });

  test('rejects schema with different provider at compile time', () => {
    const validator = createKoriResponseValidator({
      provider: TestProvider,
      validateBody: () => ok('x'),
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

    void validator.validateBody({ schema: sameProviderSchema, body: {} });
    // @ts-expect-error schema provider mismatch
    void validator.validateBody({ schema: otherProviderSchema, body: {} });
  });
});

describe('isKoriResponseValidator', () => {
  test('identifies valid validators', () => {
    const validator = createKoriResponseValidator({
      provider: TestProvider,
      validateBody: () => ok('test'),
    });

    expect(isKoriResponseValidator(validator)).toBe(true);
  });

  test('rejects invalid values', () => {
    expect(isKoriResponseValidator(null)).toBe(false);
    expect(isKoriResponseValidator({})).toBe(false);
  });
});

describe('getKoriResponseValidatorProvider', () => {
  test('returns provider', () => {
    const validator = createKoriResponseValidator({
      provider: TestProvider,
      validateBody: () => ok('test'),
    });

    expect(getKoriResponseValidatorProvider(validator)).toBe(TestProvider);
  });
});
