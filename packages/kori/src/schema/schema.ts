const OutputKey = Symbol('schema-output');

/**
 * Schema wrapper that enables unified handling of different schema libraries.
 *
 * Allows the same code to work with different schema providers while
 * preserving runtime identification and compile-time type safety.
 *
 * @template Provider - Unique string identifying the schema provider
 * @template Definition - The underlying schema definition from a schema library
 * @template Output - The output type produced by the schema
 */
export type KoriSchema<Provider extends string, Definition, Output> = {
  koriKind: 'kori-schema';
  provider: Provider;
  definition: Definition;
  [OutputKey]?: Output;
};

/**
 * Base schema type with generic provider and definition/output types.
 */
export type KoriSchemaBase = KoriSchema<string, unknown, unknown>;

/**
 * Schema type constrained to a specific provider, with unconstrained
 * definition/output types.
 *
 * Useful for type constraints where provider consistency is required
 * while keeping definition and output types flexible.
 *
 * @template Provider - Unique string identifying the schema provider
 */
export type KoriSchemaOf<Provider extends string> = KoriSchema<Provider, unknown, unknown>;

/**
 * Extracts the provider string from a Kori schema.
 *
 * @template S - The Kori schema to extract provider from
 */
export type InferSchemaProvider<S extends KoriSchemaBase> =
  S extends KoriSchema<infer Provider, infer _Definition, infer _Output> ? Provider : never;

/**
 * Extracts the output type from a Kori schema.
 *
 * @template S - The Kori schema to extract output from
 */
export type InferSchemaOutput<S extends KoriSchemaBase> =
  S extends KoriSchema<infer _Provider, infer _Definition, infer Output> ? Output : never;

/**
 * Creates a Kori schema by wrapping a schema definition with a provider string.
 *
 * Enables both runtime identification and compile-time type safety across
 * different schema providers, allowing the same API to work with any schema
 * library while preserving type information and provider identification.
 *
 * @template Provider - Unique string identifying the schema provider
 * @template Definition - The schema definition type from a schema library
 * @template Output - The output type produced by the schema
 *
 * @param options.provider - String that identifies the schema provider
 * @param options.definition - The schema definition from a schema library
 * @returns Kori schema ready for type-safe schema handling
 */
export function createKoriSchema<Provider extends string, Definition, Output>(options: {
  provider: Provider;
  definition: Definition;
}): KoriSchema<Provider, Definition, Output> {
  const { provider, definition } = options;
  return {
    koriKind: 'kori-schema',
    provider,
    definition,
  };
}

/**
 * Type guard that checks whether a value is a Kori schema.
 *
 * @param value - Value to check
 * @returns True when the value is a Kori schema
 */
export function isKoriSchema(value: unknown): value is KoriSchemaBase {
  return typeof value === 'object' && value !== null && 'koriKind' in value && value.koriKind === 'kori-schema';
}
