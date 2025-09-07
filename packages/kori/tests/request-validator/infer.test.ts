import { describe, expectTypeOf, test } from 'vitest';

import { succeed } from '../../src/util/index.js';

import { type InferRequestValidationProvider } from '../../src/request-validator/infer.js';
import { createKoriRequestValidator } from '../../src/request-validator/validator.js';

const TestProvider = Symbol('test-provider');

describe('InferRequestValidationProvider', () => {
  test('extracts provider from request validator', () => {
    const _validator = createKoriRequestValidator({
      provider: TestProvider,
      validateParams: () => succeed('test'),
      validateQueries: () => succeed('test'),
      validateHeaders: () => succeed('test'),
      validateBody: () => succeed('test'),
    });

    type Provider = InferRequestValidationProvider<typeof _validator>;
    expectTypeOf<Provider>().toEqualTypeOf<typeof TestProvider>();
  });
});
