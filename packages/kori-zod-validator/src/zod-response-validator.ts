import {
  type KoriResult,
  type InferSchemaOutput,
  ok,
  err,
  type KoriResponseValidator,
  createResponseValidator,
} from 'kori';
import { type KoriZodSchemaProvider, type KoriZodSchemaDefault } from 'kori-zod-schema';

export type KoriZodResponseValidationError = {
  message: string;
  statusCode?: number;
  errors?: unknown;
};

export type KoriZodResponseValidator = KoriResponseValidator<
  KoriZodSchemaProvider,
  KoriZodSchemaDefault,
  KoriZodResponseValidationError
>;

export function createKoriZodResponseValidator(): KoriZodResponseValidator {
  return createResponseValidator<KoriZodSchemaProvider, KoriZodSchemaDefault, KoriZodResponseValidationError>({
    validateBody: <S extends KoriZodSchemaDefault>({
      schema,
      body,
    }: {
      schema: S;
      body: unknown;
    }): KoriResult<InferSchemaOutput<S>, KoriZodResponseValidationError> => {
      try {
        const result = schema.def.safeParse(body);

        if (!result.success) {
          return err({
            message: 'Response validation failed',
            errors: result.error.errors,
          });
        }

        return ok(result.data);
      } catch (error) {
        return err({
          message: 'An error occurred during response validation',
          errors: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
