import { type z } from 'zod';

import { type KoriZodResponseSchemaContentEntry } from './entry-content.js';

/**
 * Union type representing all possible response schema entry formats.
 */
export type KoriZodResponseSchemaEntry =
  | z.ZodType
  | KoriZodResponseSchemaContentEntry<z.ZodType, Record<string, z.ZodType>>;
