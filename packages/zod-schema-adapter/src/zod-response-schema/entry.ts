import { type z } from 'zod';

import {
  type KoriZodResponseSchemaContentEntry,
  type KoriZodResponseSchemaContentEntryMappingBase,
} from './entry-content.js';
import { type KoriZodResponseSchemaSimpleEntry } from './entry-simple.js';

/**
 * Union type representing all possible response schema entry formats.
 */
export type KoriZodResponseSchemaEntry =
  | KoriZodResponseSchemaSimpleEntry<z.ZodType, z.ZodType>
  | KoriZodResponseSchemaContentEntry<z.ZodType, KoriZodResponseSchemaContentEntryMappingBase>;
