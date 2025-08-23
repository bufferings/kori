const ProviderKey = Symbol('schema-provider');
const OutputKey = Symbol('schema-output');

/**
 * Schema wrapper that enables unified handling of different schema libraries.
 *
 * Allows the same code to work with different schema providers while
 * preserving runtime identification and compile-time type safety.
 *
 * @template Provider - Unique symbol identifying the schema provider
 * @template Definition - The underlying schema definition from a schema library
 * @template Output - The output type produced by the schema
 */
export type KoriSchema<Provider extends symbol, Definition, Output> = {
  readonly [ProviderKey]: Provider;
  readonly definition: Definition;
  readonly [OutputKey]?: Output;
};

/**
 * Default schema type accepting any provider, definition, and output.
 */
export type KoriSchemaDefault = KoriSchema<symbol, unknown, unknown>;

/**
 * Schema type constrained to a specific provider, with unconstrained
 * definition/output types.
 *
 * Useful for type constraints where provider consistency is required
 * while keeping definition and output types flexible.
 *
 * @template Provider - Unique symbol identifying the schema provider
 */
export type KoriSchemaFor<Provider extends symbol> = KoriSchema<Provider, unknown, unknown>;

/**
 * Type guard that checks whether a value is a Kori schema.
 *
 * @param value - Value to check
 * @returns True when the value is a Kori schema
 */
export function isKoriSchema(value: unknown): value is KoriSchemaDefault {
  return typeof value === 'object' && value !== null && ProviderKey in value;
}

/**
 * Returns the provider symbol from a Kori schema.
 *
 * @param schema - The Kori schema to read the provider from
 * @returns The provider symbol associated with the schema
 */
export function getKoriSchemaProvider<S extends KoriSchemaDefault>(schema: S): S[typeof ProviderKey] {
  return schema[ProviderKey];
}

/**
 * Creates a Kori schema by wrapping a schema definition with a provider symbol.
 *
 * Enables both runtime identification and compile-time type safety across
 * different schema providers, allowing the same API to work with any schema
 * library while preserving type information and provider identification.
 *
 * @template Provider - Unique symbol identifying the schema provider
 * @template Definition - The schema definition type from a schema library
 * @template Output - The output type produced by the schema
 *
 * @param provider - Symbol that identifies the schema provider
 * @param definition - The schema definition from a schema library
 * @returns Kori schema ready for type-safe schema handling
 */
export function createKoriSchema<Provider extends symbol, Definition, Output>(
  provider: Provider,
  definition: Definition,
): KoriSchema<Provider, Definition, Output> {
  return {
    [ProviderKey]: provider,
    definition,
  };
}
