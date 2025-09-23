import {
  succeed,
  fail,
  type KoriResult,
  type InferSchemaOutput,
  type KoriSchemaOf,
  type KoriValidator,
  createKoriValidator,
} from '@korix/kori';
import { type StandardSchemaV1 } from '@standard-schema/spec';

import { type KoriStandardSchemaProvider, isKoriStandardSchema, STANDARD_SCHEMA_PROVIDER } from './standard-schema.js';

export type KoriStandardSchemaFailure =
  | { message: string; issues: StandardSchemaV1.Issue[] }
  | { message: string; detail: string };

export type KoriStandardSchemaValidator = KoriValidator<KoriStandardSchemaProvider, KoriStandardSchemaFailure>;

export function createKoriStandardSchemaValidator(): KoriStandardSchemaValidator {
  return createKoriValidator({
    provider: STANDARD_SCHEMA_PROVIDER,
    validate: async <S extends KoriSchemaOf<KoriStandardSchemaProvider>>({
      schema,
      value,
    }: {
      schema: S;
      value: unknown;
    }): Promise<KoriResult<InferSchemaOutput<S>, KoriStandardSchemaFailure>> => {
      try {
        if (!isKoriStandardSchema(schema)) {
          return fail({ message: 'Validation error', detail: 'Schema is not a Kori Standard Schema' });
        }

        const standardSchema = (schema.definition as StandardSchemaV1)['~standard'];
        const resolved = await standardSchema.validate(value);
        if (resolved.issues) {
          const issues = [...resolved.issues] as StandardSchemaV1.Issue[];
          return fail({ message: 'Validation error', issues });
        }
        return succeed(resolved.value as InferSchemaOutput<S>);
      } catch (e) {
        return fail({
          message: 'An error occurred during validation',
          detail: e instanceof Error ? e.message : String(e),
        });
      }
    },
  });
}
