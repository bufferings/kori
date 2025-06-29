import { type InferSchemaOutput, type KoriSchemaDefault, type KoriSchemaProviderDefault } from '../schema/index.js';
import { type MaybePromise, type KoriResult } from '../utils/index.js';

const ProviderProp = Symbol('schema-provider-prop');

export type KoriResponseValidatorMethods<Schema extends KoriSchemaDefault, ErrorType> = {
  validateBody<S extends Schema>(params: {
    schema: S;
    body: unknown;
  }): MaybePromise<KoriResult<InferSchemaOutput<S>, ErrorType>>;
};

export type KoriResponseValidator<Provider extends KoriSchemaProviderDefault, Schema extends KoriSchemaDefault, ErrorType> = {
  readonly [ProviderProp]?: Provider;
} & KoriResponseValidatorMethods<Schema, ErrorType>;

export type KoriResponseValidatorDefault = KoriResponseValidator<KoriSchemaProviderDefault, KoriSchemaDefault, unknown>;

export function createResponseValidator<
  Provider extends KoriSchemaProviderDefault,
  Schema extends KoriSchemaDefault,
  ErrorType,
>(methods: KoriResponseValidatorMethods<Schema, ErrorType>): KoriResponseValidator<Provider, Schema, ErrorType> {
  return {
    ...methods,
  };
}

export type InferResponseValidatorSchemaProvider<V extends KoriResponseValidatorDefault | undefined> =
  V extends KoriResponseValidator<infer Provider, infer _Schema, infer _ErrorType> ? Provider : never;

export type InferResponseValidationError<V extends KoriResponseValidatorDefault | undefined> =
  V extends KoriResponseValidator<infer _Provider, infer _Schema, infer ErrorType> ? ErrorType : never;
