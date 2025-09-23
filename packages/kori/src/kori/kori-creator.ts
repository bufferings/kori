import { createKoriRoot } from '../_internal/core/index.js';
import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../context/index.js';
import { type KoriValidatorBase } from '../validator/index.js';

import { type CreateKoriOptions } from './kori-creator-options.js';
import { type Kori } from './kori.js';

/**
 * Creates a new Kori instance with optional configuration.
 *
 * The main entry point for creating HTTP servers with Kori. Returns a
 * fully configured instance ready for route registration, hook setup,
 * and plugin application.
 *
 * @template ReqV - Request validation configuration for type-safe request validation
 * @template ResV - Response validation configuration for type-safe response validation
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
  ReqV extends KoriValidatorBase | undefined = undefined,
  ResV extends KoriValidatorBase | undefined = undefined,
>(options?: CreateKoriOptions<ReqV, ResV>): Kori<KoriEnvironment, KoriRequest, KoriResponse, ReqV, ResV> {
  return createKoriRoot(options);
}
