import { type StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Simple request body schema that accepts either a Standard Schema directly
 * or an object with schema, description, and examples.
 *
 * @template S - Standard Schema type for body validation
 */
export type KoriStdRequestSchemaSimpleBody<S extends StandardSchemaV1> =
  | S
  | {
      description?: string;
      schema: S;
      examples?: Record<string, unknown>;
    };
