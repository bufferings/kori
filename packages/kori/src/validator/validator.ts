import { type InferSchemaOutput, type KoriSchemaOf } from '../schema/index.js';
import { type KoriResult, type MaybePromise } from '../util/index.js';

/**
 * Validator for type-safe data validation with provider identification.
 *
 * Provides runtime validation with compile-time type safety, ensuring that
 * validators and schemas use compatible providers.
 *
 * @template Provider - Unique string identifying the schema provider
 * @template FailureReason - Type representing validation failure details
 */
export type KoriValidator<Provider extends string, FailureReason> = {
  koriKind: 'kori-validator';
  provider: Provider;
  validate: <S extends KoriSchemaOf<Provider>>(options: {
    schema: S;
    value: unknown;
  }) => MaybePromise<KoriResult<InferSchemaOutput<S>, FailureReason>>;
};

/**
 * Base validator type for any provider and failure reason.
 */
export type KoriValidatorBase = KoriValidator<string, unknown>;

/**
 * Extracts the provider string from a validator.
 *
 * @template V - Validator type
 */
export type InferValidatorProvider<V extends KoriValidatorBase> =
  V extends KoriValidator<infer Provider, infer _Failure> ? Provider : never;

/**
 * Extracts the failure reason type from a validator.
 *
 * @template V - Validator type
 */
export type InferValidatorFailureReason<V extends KoriValidatorBase> =
  V extends KoriValidator<infer _Provider, infer FailureReason> ? FailureReason : never;

/**
 * Creates a new Kori validator with provider identification.
 *
 * Enables runtime identification and compile-time type safety for validation,
 * allowing the framework to verify that validators and schemas use compatible providers.
 *
 * @template Provider - Unique string identifying the schema provider
 * @template FailureReason - Type representing validation failure details
 *
 * @param options.provider - String that identifies the schema provider
 * @param options.validate - Validation function that processes schemas
 * @returns Configured Kori validator
 */
export function createKoriValidator<Provider extends string, FailureReason>(options: {
  provider: Provider;
  validate: <S extends KoriSchemaOf<Provider>>(options: {
    schema: S;
    value: unknown;
  }) => MaybePromise<KoriResult<InferSchemaOutput<S>, FailureReason>>;
}): KoriValidator<Provider, FailureReason> {
  return {
    koriKind: 'kori-validator',
    provider: options.provider,
    validate: options.validate,
  };
}

/**
 * Checks whether a value is a Kori validator.
 *
 * @param value - Value to check
 * @returns True if the value is a Kori validator
 */
export function isKoriValidator(value: unknown): value is KoriValidatorBase {
  return typeof value === 'object' && value !== null && 'koriKind' in value && value.koriKind === 'kori-validator';
}
