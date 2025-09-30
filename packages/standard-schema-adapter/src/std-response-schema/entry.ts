import { type StandardSchemaV1 } from '@standard-schema/spec';

import { type KoriStdResponseSchemaContentEntry } from './entry-content.js';

/**
 * Union type representing all possible response schema entry formats.
 */
export type KoriStdResponseSchemaEntry =
  | StandardSchemaV1
  | KoriStdResponseSchemaContentEntry<StandardSchemaV1, Record<string, StandardSchemaV1>>;
