import {
  type KoriResult,
  type InferSchemaOutput,
  ok,
  err,
  type KoriRequestValidator,
  createRequestValidator,
} from 'kori';
import { type KoriZodSchemaDefault, type KoriZodSchemaProvider } from 'kori-zod-schema';
import { type ZodIssue } from 'zod';

export type KoriZodRequestValidationError =
  | {
      message: string;
      errors: {
        path: string[];
        message: string;
        code: string;
      }[];
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
    const result = schema.def.safeParse(data);

    if (!result.success) {
      return err({
        message: 'Validation error',
        errors: result.error.errors.map((err: ZodIssue) => ({
          path: err.path.map(String),
          message: err.message,
          code: err.code,
        })),
      });
    }

    return ok(result.data);
  } catch (error) {
    return err({
      message: 'An error occurred during validation',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

export function createKoriZodRequestValidator(): KoriZodRequestValidator {
  return createRequestValidator<KoriZodSchemaProvider, KoriZodSchemaDefault, KoriZodRequestValidationError>({
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
