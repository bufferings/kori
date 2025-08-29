import {
  type KoriResult,
  type InferSchemaOutput,
  ok,
  err,
  type KoriRequestValidator,
  createKoriRequestValidator,
} from '@korix/kori';
import { type KoriZodSchemaDefault, type KoriZodSchemaProvider, ZodSchemaProvider } from '@korix/zod-schema';
import { type $ZodIssue } from 'zod/v4/core';

export type KoriZodRequestValidationError =
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
  KoriZodRequestValidationError
>;

function validateZodSchema<S extends KoriZodSchemaDefault>(
  schema: S,
  data: unknown,
): KoriResult<InferSchemaOutput<S>, KoriZodRequestValidationError> {
  try {
    const result = schema.definition.safeParse(data);

    if (!result.success) {
      return err({
        message: 'Validation error',
        issues: result.error.issues,
      });
    }

    return ok(result.data as InferSchemaOutput<S>);
  } catch (error) {
    return err({
      message: 'An error occurred during validation',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

export function createKoriZodRequestValidator(): KoriZodRequestValidator {
  return createKoriRequestValidator<KoriZodSchemaProvider, KoriZodSchemaDefault, KoriZodRequestValidationError>({
    provider: ZodSchemaProvider,
    validateParams: <S extends KoriZodSchemaDefault>({
      schema,
      params,
    }: {
      schema: S;
      params: Record<string, string | undefined>;
    }): KoriResult<InferSchemaOutput<S>, KoriZodRequestValidationError> => {
      return validateZodSchema(schema, params);
    },
    validateQueries: <S extends KoriZodSchemaDefault>({
      schema,
      queries,
    }: {
      schema: S;
      queries: Record<string, string | string[] | undefined>;
    }): KoriResult<InferSchemaOutput<S>, KoriZodRequestValidationError> => {
      return validateZodSchema(schema, queries);
    },
    validateHeaders: <S extends KoriZodSchemaDefault>({
      schema,
      headers,
    }: {
      schema: S;
      headers: Record<string, string | string[] | undefined>;
    }): KoriResult<InferSchemaOutput<S>, KoriZodRequestValidationError> => {
      return validateZodSchema(schema, headers);
    },
    validateBody: <S extends KoriZodSchemaDefault>({
      schema,
      body,
    }: {
      schema: S;
      body: unknown;
    }): KoriResult<InferSchemaOutput<S>, KoriZodRequestValidationError> => {
      return validateZodSchema(schema, body);
    },
  });
}
