import {
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
  type KoriInstanceRequestValidationFailureHandler,
} from '@korix/kori';

import { createKoriStdValidator, type KoriStdValidator } from '../std-validator/index.js';

/**
 * A helper function to enable Standard Schema-based request validation for a Kori instance.
 *
 * @param options.onRequestValidationFailure - Custom handler for request validation failures
 * @returns Configuration object with request validator and failure handler
 *
 * @example
 * ```typescript
 * const app = createKori({
 *   ...enableStdRequestValidation({
 *     onRequestValidationFailure: (ctx, reason) => {
 *       return ctx.res.badRequest({ message: 'Validation failed' });
 *     }
 *   })
 * });
 * ```
 */
export function enableStdRequestValidation(options?: {
  onRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriStdValidator
  >;
}): {
  requestValidator: KoriStdValidator;
  onRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriStdValidator
  >;
} {
  return {
    requestValidator: createKoriStdValidator(),
    onRequestValidationFailure: options?.onRequestValidationFailure,
  };
}
