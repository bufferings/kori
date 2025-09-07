import {
  type KoriResult,
  type InferSchemaOutput,
  succeed,
  fail,
  type KoriRequestValidator,
  createKoriRequestValidator,
} from '@korix/kori';
import { type KoriZodSchemaDefault, type KoriZodSchemaProvider, ZodSchemaProvider } from '@korix/zod-schema';
import { type $ZodIssue } from 'zod/v4/core';

export type KoriZodRequestValidationFailureReason =
  | {
      message: string;
      issues: $ZodIssue[];
    }
  | {
      message: string;
      detail: string;
    };

export type KoriZodRequestValidator = KoriRequestValidator<
  KoriZodSchemaProvider,
  KoriZodSchemaDefault,
  KoriZodRequestValidationFailureReason
>;

function validateZodSchema<S extends KoriZodSchemaDefault>(
  schema: S,
  data: unknown,
): KoriResult<InferSchemaOutput<S>, KoriZodRequestValidationFailureReason> {
  try {
    const result = schema.definition.safeParse(data);

    if (!result.success) {
      return fail({
        message: 'Validation error',
        issues: result.error.issues,
      });
    }

    return succeed(result.data as InferSchemaOutput<S>);
  } catch (error) {
    return fail({
      message: 'An error occurred during validation',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

export function createKoriZodRequestValidator(): KoriZodRequestValidator {
  return createKoriRequestValidator<KoriZodSchemaProvider, KoriZodSchemaDefault, KoriZodRequestValidationFailureReason>(
    {
      provider: ZodSchemaProvider,
      validateParams: <S extends KoriZodSchemaDefault>({
        schema,
        params,
      }: {
        schema: S;
        params: Record<string, string | undefined>;
      }): KoriResult<InferSchemaOutput<S>, KoriZodRequestValidationFailureReason> => {
        return validateZodSchema(schema, params);
      },
      validateQueries: <S extends KoriZodSchemaDefault>({
        schema,
        queries,
      }: {
        schema: S;
        queries: Record<string, string | string[] | undefined>;
      }): KoriResult<InferSchemaOutput<S>, KoriZodRequestValidationFailureReason> => {
        return validateZodSchema(schema, queries);
      },
      validateHeaders: <S extends KoriZodSchemaDefault>({
        schema,
        headers,
      }: {
        schema: S;
        headers: Record<string, string | string[] | undefined>;
      }): KoriResult<InferSchemaOutput<S>, KoriZodRequestValidationFailureReason> => {
        return validateZodSchema(schema, headers);
      },
      validateBody: <S extends KoriZodSchemaDefault>({
        schema,
        body,
      }: {
        schema: S;
        body: unknown;
      }): KoriResult<InferSchemaOutput<S>, KoriZodRequestValidationFailureReason> => {
        return validateZodSchema(schema, body);
      },
    },
  );
}
