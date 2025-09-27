import { type z } from 'zod';

/**
 * Simple request body schema that accepts either a Zod schema directly
 * or an object with schema, description, and examples.
 *
 * @template Z - Zod schema type for body validation
 */
export type KoriZodRequestSchemaSimpleBody<Z extends z.ZodType> =
  | Z
  | {
      description?: string;
      schema: Z;
      examples?: Record<string, unknown>;
    };
