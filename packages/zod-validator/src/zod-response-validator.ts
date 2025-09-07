import {
  type KoriResult,
  type InferSchemaOutput,
  succeed,
  fail,
  type KoriResponseValidator,
  createKoriResponseValidator,
} from '@korix/kori';
import { type KoriZodSchemaProvider, type KoriZodSchemaDefault, ZodSchemaProvider } from '@korix/zod-schema';
import { type $ZodIssue } from 'zod/v4/core';

export type KoriZodResponseValidationFailureReason =
  | {
      message: string;
      issues: $ZodIssue[];
    }
  | {
      message: string;
      detail: string;
    };

export type KoriZodResponseValidator = KoriResponseValidator<
  KoriZodSchemaProvider,
  KoriZodSchemaDefault,
  KoriZodResponseValidationFailureReason
>;

export function createKoriZodResponseValidator(): KoriZodResponseValidator {
  return createKoriResponseValidator<
    KoriZodSchemaProvider,
    KoriZodSchemaDefault,
    KoriZodResponseValidationFailureReason
  >({
    provider: ZodSchemaProvider,
    validateBody: <S extends KoriZodSchemaDefault>({
      schema,
      body,
    }: {
      schema: S;
      body: unknown;
    }): KoriResult<InferSchemaOutput<S>, KoriZodResponseValidationFailureReason> => {
      try {
        const result = schema.definition.safeParse(body);

        if (!result.success) {
          return fail({
            message: 'Response validation failed',
            issues: result.error.issues,
          });
        }

        return succeed(result.data as InferSchemaOutput<S>);
      } catch (error) {
        return fail({
          message: 'An error occurred during response validation',
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
