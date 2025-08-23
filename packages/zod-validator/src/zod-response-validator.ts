import {
  type KoriResult,
  type InferSchemaOutput,
  ok,
  err,
  type KoriResponseValidator,
  createKoriResponseValidator,
} from '@korix/kori';
import { type KoriZodSchemaProvider, type KoriZodSchemaDefault, ZodSchemaProvider } from '@korix/zod-schema';
import { type $ZodIssue } from 'zod/v4/core';

export type KoriZodResponseValidationError = {
  message: string;
  statusCode?: number;
  issues?: $ZodIssue[];
};

export type KoriZodResponseValidator = KoriResponseValidator<
  KoriZodSchemaProvider,
  KoriZodSchemaDefault,
  KoriZodResponseValidationError
>;

export function createKoriZodResponseValidator(): KoriZodResponseValidator {
  return createKoriResponseValidator<KoriZodSchemaProvider, KoriZodSchemaDefault, KoriZodResponseValidationError>(
    ZodSchemaProvider,
    {
      validateBody: <S extends KoriZodSchemaDefault>({
        schema,
        body,
      }: {
        schema: S;
        body: unknown;
      }): KoriResult<InferSchemaOutput<S>, KoriZodResponseValidationError> => {
        try {
          const result = schema.definition.safeParse(body);

          if (!result.success) {
            return err({
              message: 'Response validation failed',
              issues: result.error.issues,
            });
          }

          return ok(result.data as InferSchemaOutput<S>);
        } catch (error) {
          return err({
            message: 'An error occurred during response validation',
            errors: error instanceof Error ? error.message : String(error),
          });
        }
      },
    },
  );
}
