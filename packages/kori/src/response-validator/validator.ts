import { type InferSchemaOutput, type KoriSchemaDefault, type KoriSchemaFor } from '../schema/index.js';
import { type KoriResult, type MaybePromise } from '../util/index.js';

const ProviderKey = Symbol('response-validator-provider');

/**
 * Response validator for validating HTTP response components.
 *
 * Provides type-safe validation methods for response body using schema definitions.
 *
 * @template Provider - Unique symbol identifying the validator provider
 * @template Schema - Kori schema type for validation
 * @template FailureReason - Failure reason type returned by validation methods
 */
export type KoriResponseValidator<Provider extends symbol, Schema extends KoriSchemaFor<Provider>, FailureReason> = {
  [ProviderKey]: Provider;
  validateBody<S extends Schema>(options: {
    schema: S;
    body: unknown;
  }): MaybePromise<KoriResult<InferSchemaOutput<S>, FailureReason>>;
};

/**
 * Default response validator type with generic provider and failure reason types.
 */
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

/**
 * Creates a Kori response validator with provider identification.
 *
 * @template Provider - Unique symbol identifying the validator provider
 * @template Schema - Kori schema type for validation
 * @template FailureReason - Failure reason type for validation results
 *
 * @param options - Options for creating the validator
 * @param options.provider - Symbol that identifies the validator provider
 * @param options.validateBody - Validation method for response body
 * @returns Kori response validator ready for type-safe validation
 */
export function createKoriResponseValidator<
  Provider extends symbol,
  Schema extends KoriSchemaFor<Provider>,
  FailureReason,
>(options: {
  provider: Provider;
  validateBody: (options: {
    schema: Schema;
    body: unknown;
  }) => MaybePromise<KoriResult<InferSchemaOutput<Schema>, FailureReason>>;
}): KoriResponseValidator<Provider, Schema, FailureReason> {
  const { provider, validateBody } = options;
  return {
    [ProviderKey]: provider,
    validateBody,
  };
}
