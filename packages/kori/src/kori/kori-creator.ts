import { createKoriRoot } from '../_internal/core/index.js';
import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../context/index.js';
import { type KoriRequestValidatorDefault } from '../request-validator/index.js';
import { type KoriResponseValidatorDefault } from '../response-validator/index.js';

import { type CreateKoriOptions } from './kori-options.js';
import { type Kori } from './kori.js';

/**
 * Creates a new Kori instance with optional configuration.
 *
 * The main entry point for creating HTTP servers with Kori. Returns a
 * fully configured instance ready for route registration, hook setup,
 * and plugin application.
 *
 * @template RequestValidator - Request validator for type-safe validation
 * @template ResponseValidator - Response validator for type-safe validation
 *
 * @param options - Configuration options for the Kori instance
 * @returns Configured Kori instance ready for use
 *
 * @example
 * ```typescript
 * // Basic instance
 * const app = createKori();
 *
 * // With validation
 * const app = createKori({
 *   requestValidator: myRequestValidator,
 *   responseValidator: myResponseValidator,
 *   loggerOptions: { level: 'warn' }
 * });
 * ```
 */
export function createKori<
  RequestValidator extends KoriRequestValidatorDefault | undefined = undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined = undefined,
>(
  options?: CreateKoriOptions<RequestValidator, ResponseValidator>,
): Kori<KoriEnvironment, KoriRequest, KoriResponse, RequestValidator, ResponseValidator> {
  return createKoriRoot(options);
}
