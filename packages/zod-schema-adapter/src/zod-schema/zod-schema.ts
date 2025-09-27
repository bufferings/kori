import { type KoriSchema, createKoriSchema, isKoriSchema } from '@korix/kori';
import { type z } from 'zod';

import { type KoriZodSchemaProvider, ZOD_SCHEMA_PROVIDER } from './zod-schema-provider.js';

/**
 * Kori schema wrapper for Zod types with proper type inference.
 *
 * @template T - The Zod type being wrapped
 */
export type KoriZodSchema<T extends z.ZodType> = KoriSchema<KoriZodSchemaProvider, T, z.output<T>>;

/**
 * Base type for any Zod schema wrapped in Kori's schema system.
 */
export type KoriZodSchemaBase = KoriZodSchema<z.ZodType>;

/**
 * Wraps a Zod schema to make it compatible with Kori's validation system.
 *
 * @template T - The Zod type to wrap
 * @param schema - The Zod schema to wrap
 * @returns A Kori-compatible schema wrapper
 *
 * @example
 * ```typescript
 * const userSchema = createKoriZodSchema(z.object({
 *   name: z.string(),
 *   age: z.number()
 * }));
 * ```
 */
export const createKoriZodSchema = <T extends z.ZodType>(schema: T): KoriZodSchema<T> => {
  return createKoriSchema<KoriZodSchemaProvider, T, z.output<T>>({ provider: ZOD_SCHEMA_PROVIDER, definition: schema });
};

/**
 * Type guard to check if a value is a Kori Zod schema.
 *
 * @param value - The value to check
 * @returns True if the value is a Kori Zod schema
 */
export function isKoriZodSchema(value: unknown): value is KoriZodSchemaBase {
  return isKoriSchema(value) && value.provider === ZOD_SCHEMA_PROVIDER;
}
