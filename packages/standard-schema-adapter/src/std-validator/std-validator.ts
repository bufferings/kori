import {
  succeed,
  type KoriResult,
  type InferSchemaOutput,
  type KoriSchemaOf,
  type KoriValidator,
  createKoriValidator,
} from '@korix/kori';

import { type KoriStdSchemaProvider, STANDARD_SCHEMA_PROVIDER, isKoriStdSchema } from '../std-schema/index.js';

import { failWithStdGeneralFailure, failWithStdValidationFailure, type KoriStdFailure } from './std-failure.js';

/**
 * Validator instance specifically configured for Standard Schemas.
 */
export type KoriStdValidator = KoriValidator<KoriStdSchemaProvider, KoriStdFailure>;

/**
 * Creates a validator that can validate data against Standard Schemas within Kori's validation system.
 *
 * The validator handles Standard Schema's `validate` method and transforms results into Kori's
 * standard result format, preserving detailed error information from Standard Schema.
 *
 * @returns A validator configured for Standard Schemas
 */
export function createKoriStdValidator(): KoriStdValidator {
  return createKoriValidator({
    provider: STANDARD_SCHEMA_PROVIDER,
    validate: async <S extends KoriSchemaOf<KoriStdSchemaProvider>>({
      schema,
      value,
    }: {
      schema: S;
      value: unknown;
    }): Promise<KoriResult<InferSchemaOutput<S>, KoriStdFailure>> => {
      try {
        if (!isKoriStdSchema(schema)) {
          return failWithStdGeneralFailure({
            message: 'Validation error',
            detail: 'Schema is not a Kori Standard Schema',
          });
        }

        const r = await schema.definition['~standard'].validate(value);
        if (r.issues) {
          return failWithStdValidationFailure({ message: 'Validation error', issues: [...r.issues] });
        }
        return succeed(r.value as InferSchemaOutput<S>);
      } catch (e) {
        return failWithStdGeneralFailure({
          message: 'An error occurred during validation',
          detail: e instanceof Error ? e.message : String(e),
        });
      }
    },
  });
}
