import {
  succeed,
  type KoriResult,
  type InferSchemaOutput,
  type KoriSchemaOf,
  type KoriValidator,
  createKoriValidator,
} from '@korix/kori';

import { type KoriZodSchemaProvider, ZOD_SCHEMA_PROVIDER, isKoriZodSchema } from '../zod-schema/index.js';

import { failGeneral, failZod, type KoriZodFailure } from './zod-failure.js';

/**
 * Validator instance specifically configured for Zod schemas.
 */
export type KoriZodValidator = KoriValidator<KoriZodSchemaProvider, KoriZodFailure>;

/**
 * Creates a validator that can validate data against Zod schemas within Kori's validation system.
 *
 * The validator handles Zod's `safeParse` method and transforms results into Kori's
 * standard result format, preserving detailed error information from Zod.
 *
 * @returns A validator configured for Zod schemas
 */
export function createKoriZodValidator(): KoriZodValidator {
  return createKoriValidator({
    provider: ZOD_SCHEMA_PROVIDER,
    validate: <S extends KoriSchemaOf<KoriZodSchemaProvider>>({
      schema,
      value,
    }: {
      schema: S;
      value: unknown;
    }): KoriResult<InferSchemaOutput<S>, KoriZodFailure> => {
      try {
        if (!isKoriZodSchema(schema)) {
          return failGeneral({ message: 'Validation error', detail: 'Schema is not a Kori Zod schema' });
        }

        const r = schema.definition.safeParse(value);
        if (!r.success) {
          return failZod({ message: 'Validation error', issues: r.error.issues });
        }
        return succeed(r.data as InferSchemaOutput<S>);
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        return failGeneral({ message: 'An error occurred during validation', detail });
      }
    },
  });
}
