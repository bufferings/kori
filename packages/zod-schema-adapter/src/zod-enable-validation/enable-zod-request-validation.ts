import {
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
  type KoriInstanceRequestValidationFailureHandler,
} from '@korix/kori';

import { createKoriZodValidator, type KoriZodValidator } from '../zod-validator/index.js';

/**
 * A helper function to enable Zod-based request validation for a Kori instance.
 *
 * @param options.onRequestValidationFailure - Custom handler for request validation failures
 * @returns Configuration object with request validator and failure handler
 *
 * @example
 * ```typescript
 * const app = createKori({
 *   ...enableZodRequestValidation({
 *     onRequestValidationFailure: (ctx, reason) => {
 *       return ctx.res.badRequest({ message: 'Validation failed' });
 *     }
 *   })
 * });
 * ```
 */
export function enableZodRequestValidation(options?: {
  onRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriZodValidator
  >;
}): {
  requestValidator: KoriZodValidator;
  onRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriZodValidator
  >;
} {
  return {
    requestValidator: createKoriZodValidator(),
    onRequestValidationFailure: options?.onRequestValidationFailure,
  };
}
