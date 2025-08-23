import { type InferSchemaOutput, type KoriSchemaDefault } from '../schema/index.js';
import { type MaybePromise, type KoriResult } from '../util/index.js';

const ProviderKey = Symbol('schema-provider');

export type KoriResponseValidatorMethods<Schema extends KoriSchemaDefault, ErrorType> = {
  validateBody<S extends Schema>(params: {
    schema: S;
    body: unknown;
  }): MaybePromise<KoriResult<InferSchemaOutput<S>, ErrorType>>;
};

export type KoriResponseValidator<Provider extends symbol, Schema extends KoriSchemaDefault, ErrorType> = {
  readonly [ProviderKey]: Provider;
} & KoriResponseValidatorMethods<Schema, ErrorType>;

export type KoriResponseValidatorDefault = KoriResponseValidator<symbol, KoriSchemaDefault, unknown>;

/**
 * Type guard to check if a value is a Kori response validator.
 *
 * @param value - The value to check
 * @returns True if the value is a Kori response validator
 */
export function isKoriResponseValidator(value: unknown): value is KoriResponseValidatorDefault {
  return typeof value === 'object' && value !== null && ProviderKey in value;
}

/**
 * Returns the provider symbol from a Kori response validator.
 *
 * @param validator - The Kori response validator to read the provider from
 * @returns The provider symbol associated with the validator
 */
export function getKoriResponseValidatorProvider<V extends KoriResponseValidatorDefault>(
  validator: V,
): V[typeof ProviderKey] {
  return validator[ProviderKey];
}

export function createKoriResponseValidator<Provider extends symbol, Schema extends KoriSchemaDefault, ErrorType>(
  provider: Provider,
  methods: KoriResponseValidatorMethods<Schema, ErrorType>,
): KoriResponseValidator<Provider, Schema, ErrorType> {
  return {
    [ProviderKey]: provider,
    ...methods,
  };
}
