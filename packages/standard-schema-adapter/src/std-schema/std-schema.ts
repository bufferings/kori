import { type KoriSchema, createKoriSchema, isKoriSchema } from '@korix/kori';
import { type StandardSchemaV1 } from '@standard-schema/spec';

import { STANDARD_SCHEMA_PROVIDER, type KoriStdSchemaProvider } from './std-schema-provider.js';

/**
 * Kori schema wrapper for Standard Schema types with proper type inference.
 *
 * @template T - The Standard Schema type being wrapped
 */
export type KoriStdSchema<T extends StandardSchemaV1> = KoriSchema<
  KoriStdSchemaProvider,
  T,
  StandardSchemaV1.InferOutput<T>
>;

/**
 * Base type for any Standard Schema wrapped in Kori's schema system.
 */
export type KoriStdSchemaBase = KoriStdSchema<StandardSchemaV1>;

/**
 * Wraps a Standard Schema to make it compatible with Kori's validation system.
 *
 * @template T - The Standard Schema type to wrap
 * @param schema - The Standard Schema to wrap
 * @returns A Kori-compatible schema wrapper
 *
 * @example
 * ```typescript
 * const userSchema = createKoriStdSchema(z.object({
 *   name: z.string(),
 *   age: z.number()
 * }));
 * ```
 */
export const createKoriStdSchema = <T extends StandardSchemaV1>(schema: T): KoriStdSchema<T> => {
  return createKoriSchema<KoriStdSchemaProvider, T, StandardSchemaV1.InferOutput<T>>({
    provider: STANDARD_SCHEMA_PROVIDER,
    definition: schema,
  });
};

/**
 * Type guard to check if a value is a Kori Standard Schema.
 *
 * @param value - The value to check
 * @returns True if the value is a Kori Standard Schema
 */
export function isKoriStdSchema(value: unknown): value is KoriStdSchemaBase {
  return isKoriSchema(value) && value.provider === STANDARD_SCHEMA_PROVIDER;
}
