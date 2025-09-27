import {
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
  type KoriInstanceRequestValidationFailureHandler,
  type KoriInstanceResponseValidationFailureHandler,
} from '@korix/kori';

import { createKoriZodValidator, type KoriZodValidator } from '../zod-validator/index.js';

/**
 * A helper function to enable Zod-based validation for both requests and responses in a Kori instance.
 *
 * @param options.onRequestValidationFailure - Custom handler for request validation failures
 * @param options.onResponseValidationFailure - Custom handler for response validation failures
 * @returns Configuration object with both validators and their failure handlers
 *
 * @example
 * ```typescript
 * const app = createKori({
 *   ...enableZodRequestAndResponseValidation({
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
export function enableZodRequestAndResponseValidation(options?: {
  onRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriZodValidator
  >;
  onResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriZodValidator
  >;
}): {
  requestValidator: KoriZodValidator;
  responseValidator: KoriZodValidator;
  onRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriZodValidator
  >;
  onResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriZodValidator
  >;
} {
  return {
    requestValidator: createKoriZodValidator(),
    responseValidator: createKoriZodValidator(),
    onRequestValidationFailure: options?.onRequestValidationFailure,
    onResponseValidationFailure: options?.onResponseValidationFailure,
  };
}
