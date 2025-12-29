import {
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
  type KoriInstanceResponseValidationFailureHandler,
} from '@korix/kori';

import { createKoriStdValidator, type KoriStdValidator } from '../std-validator/index.js';

/**
 * A helper function to enable Standard Schema-based response validation for a Kori instance.
 *
 * @param options.onResponseValidationFailure - Custom handler for response validation failures
 * @returns Configuration object with response validator and failure handler
 *
 * @example
 * ```typescript
 * const app = createKori({
 *   ...enableStdResponseValidation({
 *     onResponseValidationFailure: (ctx, reason) => {
 *       ctx.log().error('Response validation failed', reason);
 *     }
 *   })
 * });
 * ```
 */
export function enableStdResponseValidation(options?: {
  onResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriStdValidator
  >;
}): {
  responseValidator: KoriStdValidator;
  onResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriStdValidator
  >;
} {
  return {
    responseValidator: createKoriStdValidator(),
    onResponseValidationFailure: options?.onResponseValidationFailure,
  };
}
