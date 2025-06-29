import { type InferSchemaOutput, type KoriSchemaDefault, type KoriSchemaProviderDefault } from '../schema/index.js';
import { type KoriResult, type MaybePromise } from '../util/index.js';

const ProviderProp = Symbol('schema-provider-prop');

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

export type KoriRequestValidator<
  Provider extends KoriSchemaProviderDefault,
  Schema extends KoriSchemaDefault,
  ErrorType,
> = {
  readonly [ProviderProp]?: Provider;
} & KoriRequestValidatorMethods<Schema, ErrorType>;

export type KoriRequestValidatorDefault = KoriRequestValidator<KoriSchemaProviderDefault, KoriSchemaDefault, unknown>;

export function createRequestValidator<
  Provider extends KoriSchemaProviderDefault,
  Schema extends KoriSchemaDefault,
  ErrorType,
>(methods: KoriRequestValidatorMethods<Schema, ErrorType>): KoriRequestValidator<Provider, Schema, ErrorType> {
  return {
    ...methods,
  };
}

export type InferRequestValidatorSchemaProvider<V extends KoriRequestValidatorDefault | undefined> =
  V extends KoriRequestValidator<infer Provider, infer _Schema, infer _ErrorType> ? Provider : never;

export type KoriRequestValidatorError<ErrorType> = {
  params: ErrorType | undefined;
  queries: ErrorType | undefined;
  headers: ErrorType | undefined;
  body: ErrorType | undefined;
};

export type KoriRequestValidatorErrorDefault = KoriRequestValidatorError<unknown>;

export type InferRequestValidatorError<V extends KoriRequestValidatorDefault | undefined> =
  V extends KoriRequestValidator<infer _Provider, infer _Schema, infer ErrorType>
    ? KoriRequestValidatorError<ErrorType>
    : never;
