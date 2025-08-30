import { describe, expectTypeOf, test } from 'vitest';

import { createKoriRequestValidator, type InferRequestValidationProvider } from '../../src/request-validator/index.js';
import { ok } from '../../src/util/index.js';

const TestProvider = Symbol('test-provider');

describe('InferRequestValidationProvider', () => {
  test('extracts provider from request validator', () => {
    const _validator = createKoriRequestValidator({
      provider: TestProvider,
      validateParams: () => ok('test'),
      validateQueries: () => ok('test'),
      validateHeaders: () => ok('test'),
      validateBody: () => ok('test'),
    });

    type Provider = InferRequestValidationProvider<typeof _validator>;
    expectTypeOf<Provider>().toEqualTypeOf<typeof TestProvider>();
  });
});
