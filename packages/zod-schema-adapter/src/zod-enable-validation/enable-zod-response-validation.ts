import {
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
  type KoriInstanceResponseValidationFailureHandler,
} from '@korix/kori';

import { createKoriZodValidator, type KoriZodValidator } from '../zod-validator/index.js';

/**
 * A helper function to enable Zod-based response validation for a Kori instance.
 *
 * @param options.onResponseValidationFailure - Custom handler for response validation failures
 * @returns Configuration object with response validator and failure handler
 *
 * @example
 * ```typescript
 * const app = createKori({
 *   ...enableZodResponseValidation({
 *     onResponseValidationFailure: (ctx, reason) => {
 *       ctx.log().error('Response validation failed', reason);
 *     }
 *   })
 * });
 * ```
 */
export function enableZodResponseValidation(options?: {
  onResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriZodValidator
  >;
}): {
  responseValidator: KoriZodValidator;
  onResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriZodValidator
  >;
} {
  return {
    responseValidator: createKoriZodValidator(),
    onResponseValidationFailure: options?.onResponseValidationFailure,
  };
}
