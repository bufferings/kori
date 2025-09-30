import {
  createKoriResponseSchema,
  type KoriResponseSchema,
  type KoriResponseSchemaEntry,
  type KoriResponseSchemaStatusCode,
} from '@korix/kori';

import { STANDARD_SCHEMA_PROVIDER, type KoriStdSchemaProvider } from '../std-schema/index.js';

import { toKoriEntries, type KoriResponseSchemaStdToEntries } from './entry-transformer.js';
import { type KoriStdResponseSchemaEntry } from './entry.js';

/**
 * Response schema using Standard Schema for validation.
 *
 * @template Responses - Response schema entries mapped by status code
 */
export type KoriStdResponseSchema<
  Responses extends Partial<Record<KoriResponseSchemaStatusCode, KoriResponseSchemaEntry<KoriStdSchemaProvider>>>,
> = KoriResponseSchema<KoriStdSchemaProvider, Responses>;

/**
 * Creates a response schema using Standard Schema for validation.
 *
 * Converts Standard Schema schemas to Kori-compatible response schema format. Supports multiple response
 * formats including simple schemas, content-type specific schemas, and OpenAPI-style metadata.
 *
 * @template StdResponses - Response schema entries mapped by HTTP status code
 * @param responses - Response definitions using Standard Schema schemas
 * @returns Kori response schema with type-safe validation
 *
 * @example
 * ```typescript
 * const responseSchema = stdResponseSchema({
 *   200: z.object({ message: z.string() }),
 *   400: {
 *     description: 'Bad request',
 *     content: {
 *       'application/json': z.object({ error: z.string() })
 *     }
 *   }
 * });
 * ```
 */
export function stdResponseSchema<
  StdResponses extends Partial<Record<KoriResponseSchemaStatusCode, KoriStdResponseSchemaEntry>>,
>(responses: StdResponses): KoriStdResponseSchema<KoriResponseSchemaStdToEntries<StdResponses>> {
  return createKoriResponseSchema({
    provider: STANDARD_SCHEMA_PROVIDER,
    responses: toKoriEntries(responses),
  });
}
