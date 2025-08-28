import { type InferSchemaOutput, type KoriSchemaDefault } from '../schema/index.js';
import { type KoriResult, type MaybePromise } from '../util/index.js';

const ProviderKey = Symbol('schema-provider');

export type KoriRequestValidatorMethods<Schema extends KoriSchemaDefault, ErrorType> = {
  validateParams<S extends Schema>(params: {
    schema: S;
    params: Record<string, string | undefined>;
  }): MaybePromise<KoriResult<InferSchemaOutput<S>, ErrorType>>;
  validateQueries<S extends Schema>(params: {
    schema: S;
    queries: Record<string, string | string[] | undefined>;
  }): MaybePromise<KoriResult<InferSchemaOutput<S>, ErrorType>>;
  validateHeaders<S extends Schema>(params: {
    schema: S;
    headers: Record<string, string | string[] | undefined>;
  }): MaybePromise<KoriResult<InferSchemaOutput<S>, ErrorType>>;
  validateBody<S extends Schema>(params: {
    schema: S;
    body: unknown;
  }): MaybePromise<KoriResult<InferSchemaOutput<S>, ErrorType>>;
};

export type KoriRequestValidator<Provider extends symbol, Schema extends KoriSchemaDefault, ErrorType> = {
  [ProviderKey]: Provider;
} & KoriRequestValidatorMethods<Schema, ErrorType>;

export type KoriRequestValidatorDefault = KoriRequestValidator<symbol, KoriSchemaDefault, unknown>;

export function createKoriRequestValidator<Provider extends symbol, Schema extends KoriSchemaDefault, ErrorType>(
  provider: Provider,
  methods: KoriRequestValidatorMethods<Schema, ErrorType>,
): KoriRequestValidator<Provider, Schema, ErrorType> {
  return {
    [ProviderKey]: provider,
    ...methods,
  };
}

/**
 * Type guard to check if a value is a Kori request validator.
 *
 * @param value - The value to check
 * @returns True if the value is a Kori request validator
 */
export function isKoriRequestValidator(value: unknown): value is KoriRequestValidatorDefault {
  return typeof value === 'object' && value !== null && ProviderKey in value;
}

/**
 * Returns the provider symbol from a Kori request validator.
 *
 * @param validator - The Kori request validator to read the provider from
 * @returns The provider symbol associated with the validator
 */
export function getKoriRequestValidatorProvider<V extends KoriRequestValidatorDefault>(
  validator: V,
): V[typeof ProviderKey] {
  return validator[ProviderKey];
}
