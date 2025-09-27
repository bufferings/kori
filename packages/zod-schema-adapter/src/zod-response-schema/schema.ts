import {
  createKoriResponseSchema,
  type KoriResponseSchema,
  type KoriResponseSchemaEntry,
  type KoriResponseSchemaStatusCode,
} from '@korix/kori';

import { type KoriZodSchemaProvider, ZOD_SCHEMA_PROVIDER } from '../zod-schema/index.js';

import { toKoriEntries, type KoriResponseSchemaZodToEntries } from './entry-transformer.js';
import { type KoriZodResponseSchemaEntry } from './entry.js';

/**
 * Response schema using Zod for validation.
 *
 * @template Responses - Response schema entries mapped by status code
 */
export type KoriZodResponseSchema<
  Responses extends Partial<Record<KoriResponseSchemaStatusCode, KoriResponseSchemaEntry<KoriZodSchemaProvider>>>,
> = KoriResponseSchema<KoriZodSchemaProvider, Responses>;

/**
 * Creates a response schema using Zod for validation.
 *
 * Converts Zod schemas to Kori-compatible response schema format. Supports multiple response
 * formats including simple schemas, content-type specific schemas, and OpenAPI-style metadata.
 *
 * @template ZResponses - Response schema entries mapped by HTTP status code
 * @param responses - Response definitions using Zod schemas
 * @returns Kori response schema with type-safe validation
 *
 * @example
 * ```typescript
 * const responseSchema = zodResponseSchema({
 *   200: z.object({ message: z.string() }),
 *   400: { schema: z.object({ error: z.string() }), description: 'Bad request' }
 * });
 * ```
 */
export function zodResponseSchema<
  ZResponses extends Partial<Record<KoriResponseSchemaStatusCode, KoriZodResponseSchemaEntry>>,
>(responses: ZResponses): KoriZodResponseSchema<KoriResponseSchemaZodToEntries<ZResponses>> {
  return createKoriResponseSchema({
    provider: ZOD_SCHEMA_PROVIDER,
    responses: toKoriEntries(responses),
  });
}
