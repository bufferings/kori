import { type InferSchemaOutput, type KoriSchemaDefault, type KoriSchemaFor } from '../schema/index.js';
import { type KoriResult, type MaybePromise } from '../util/index.js';

const ProviderKey = Symbol('request-validator-provider');

/**
 * Request validator for validating HTTP request components.
 *
 * Provides type-safe validation methods for path parameters, query parameters,
 * headers, and request body using schema definitions.
 *
 * @template Provider - Unique symbol identifying the validator provider
 * @template Schema - Kori schema type for validation
 * @template FailureReason - Failure reason type returned by validation methods
 */
export type KoriRequestValidator<Provider extends symbol, Schema extends KoriSchemaFor<Provider>, FailureReason> = {
  [ProviderKey]: Provider;
  validateParams<S extends Schema>(options: {
    schema: S;
    params: Record<string, string | undefined>;
  }): MaybePromise<KoriResult<InferSchemaOutput<S>, FailureReason>>;
  validateQueries<S extends Schema>(options: {
    schema: S;
    queries: Record<string, string | string[] | undefined>;
  }): MaybePromise<KoriResult<InferSchemaOutput<S>, FailureReason>>;
  validateHeaders<S extends Schema>(options: {
    schema: S;
    headers: Record<string, string | string[] | undefined>;
  }): MaybePromise<KoriResult<InferSchemaOutput<S>, FailureReason>>;
  validateBody<S extends Schema>(options: {
    schema: S;
    body: unknown;
  }): MaybePromise<KoriResult<InferSchemaOutput<S>, FailureReason>>;
};

/**
 * Default request validator type with generic provider and failure reason types.
 */
export type KoriRequestValidatorDefault = KoriRequestValidator<symbol, KoriSchemaDefault, unknown>;

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

/**
 * Creates a Kori request validator with provider identification.
 *
 * @template Provider - Unique symbol identifying the validator provider
 * @template Schema - Kori schema type for validation
 * @template FailureReason - Failure reason type for validation results
 *
 * @param options - Options for creating the validator
 * @param options.provider - Symbol that identifies the validator provider
 * @param options.validateParams - Validation method for request parameters
 * @param options.validateQueries - Validation method for request queries
 * @param options.validateHeaders - Validation method for request headers
 * @param options.validateBody - Validation method for request body
 * @returns Kori request validator ready for type-safe validation
 */
export function createKoriRequestValidator<
  Provider extends symbol,
  Schema extends KoriSchemaFor<Provider>,
  FailureReason,
>(options: {
  provider: Provider;
  validateParams: (options: {
    schema: Schema;
    params: Record<string, string | undefined>;
  }) => MaybePromise<KoriResult<InferSchemaOutput<Schema>, FailureReason>>;
  validateQueries: (options: {
    schema: Schema;
    queries: Record<string, string | string[] | undefined>;
  }) => MaybePromise<KoriResult<InferSchemaOutput<Schema>, FailureReason>>;
  validateHeaders: (options: {
    schema: Schema;
    headers: Record<string, string | string[] | undefined>;
  }) => MaybePromise<KoriResult<InferSchemaOutput<Schema>, FailureReason>>;
  validateBody: (options: {
    schema: Schema;
    body: unknown;
  }) => MaybePromise<KoriResult<InferSchemaOutput<Schema>, FailureReason>>;
}): KoriRequestValidator<Provider, Schema, FailureReason> {
  const { provider, validateParams, validateQueries, validateHeaders, validateBody } = options;
  return {
    [ProviderKey]: provider,
    validateParams,
    validateQueries,
    validateHeaders,
    validateBody,
  };
}
