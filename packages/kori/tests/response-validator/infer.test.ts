import { describe, expectTypeOf, test } from 'vitest';

import { ok } from '../../src/util/index.js';

import { type InferResponseValidationProvider } from '../../src/response-validator/infer.js';
import { createKoriResponseValidator } from '../../src/response-validator/validator.js';

const TestProvider = Symbol('test-provider');

describe('InferResponseValidationProvider', () => {
  test('extracts provider from response validator', () => {
    const _validator = createKoriResponseValidator({
      provider: TestProvider,
      validateBody: () => ok('test'),
    });

    type Provider = InferResponseValidationProvider<typeof _validator>;
    expectTypeOf<Provider>().toEqualTypeOf<typeof TestProvider>();
  });
});
