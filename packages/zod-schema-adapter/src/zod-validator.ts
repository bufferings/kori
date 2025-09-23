import {
  succeed,
  fail,
  type KoriResult,
  type InferSchemaOutput,
  type KoriSchemaOf,
  type KoriValidator,
  createKoriValidator,
} from '@korix/kori';

import { type KoriZodSchemaProvider, ZOD_SCHEMA_PROVIDER, isKoriZodSchema } from './zod-schema.js';

export type KoriZodFailure = { message: string; issues: unknown[] } | { message: string; detail: string };

export type KoriZodValidator = KoriValidator<KoriZodSchemaProvider, KoriZodFailure>;

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
          return fail({ message: 'Validation error', detail: 'Schema is not a Kori Zod schema' });
        }
        const r = schema.definition.safeParse(value);
        if (!r.success) {
          return fail({ message: 'Validation error', issues: r.error.issues });
        }
        return succeed(r.data as InferSchemaOutput<S>);
      } catch (e) {
        return fail({
          message: 'An error occurred during validation',
          detail: e instanceof Error ? e.message : String(e),
        });
      }
    },
  });
}
