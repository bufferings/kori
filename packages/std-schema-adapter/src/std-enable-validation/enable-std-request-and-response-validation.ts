import {
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
  type KoriInstanceRequestValidationFailureHandler,
  type KoriInstanceResponseValidationFailureHandler,
} from '@korix/kori';

import { createKoriStdValidator, type KoriStdValidator } from '../std-validator/index.js';

/**
 * A helper function to enable Standard Schema-based validation for both requests and responses in a Kori instance.
 *
 * @param options.onRequestValidationFailure - Custom handler for request validation failures
 * @param options.onResponseValidationFailure - Custom handler for response validation failures
 * @returns Configuration object with both validators and their failure handlers
 *
 * @example
 * ```typescript
 * const app = createKori({
 *   ...enableStdRequestAndResponseValidation({
 *     onRequestValidationFailure: (ctx, reason) => {
 *       return ctx.res.badRequest({ message: 'Invalid request data' });
 *     },
 *     onResponseValidationFailure: (ctx, reason) => {
 *       ctx.log().error('Response validation failed', reason);
 *     }
 *   })
 * });
 * ```
 */
export function enableStdRequestAndResponseValidation(options?: {
  onRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriStdValidator
  >;
  onResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriStdValidator
  >;
}): {
  requestValidator: KoriStdValidator;
  responseValidator: KoriStdValidator;
  onRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriStdValidator
  >;
  onResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriStdValidator
  >;
} {
  return {
    requestValidator: createKoriStdValidator(),
    responseValidator: createKoriStdValidator(),
    onRequestValidationFailure: options?.onRequestValidationFailure,
    onResponseValidationFailure: options?.onResponseValidationFailure,
  };
}
