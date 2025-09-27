import { type StandardSchemaV1 } from '@standard-schema/spec';

import {
  type KoriStdResponseSchemaContentEntry,
  type KoriStdResponseSchemaContentEntryMappingBase,
} from './entry-content.js';
import { type KoriStdResponseSchemaSimpleEntry } from './entry-simple.js';

/**
 * Union type representing all possible response schema entry formats.
 */
export type KoriStdResponseSchemaEntry =
  | KoriStdResponseSchemaSimpleEntry<StandardSchemaV1, StandardSchemaV1>
  | KoriStdResponseSchemaContentEntry<StandardSchemaV1, KoriStdResponseSchemaContentEntryMappingBase>;
