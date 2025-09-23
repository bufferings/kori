import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../context/index.js';
import { type KoriLoggerFactoryOptions, type KoriLoggerFactory } from '../logging/index.js';
import { type KoriRouteMatcher } from '../route-matcher/index.js';
import {
  type KoriInstanceRequestValidationFailureHandler,
  type KoriInstanceResponseValidationFailureHandler,
} from '../routing/index.js';
import { type MaybePromise } from '../util/index.js';
import { type KoriValidatorBase } from '../validator/index.js';

/**
 * Logger configuration options with mutually exclusive choices.
 *
 * Provides three ways to configure logging: use an existing factory,
 * create a factory from options, or use default configuration
 * (ConsoleReporter with INFO level).
 */
type LoggerConfig =
  /** Use existing logger factory */
  | { loggerFactory: KoriLoggerFactory; loggerOptions?: never }
  /** Create logger factory from options */
  | { loggerFactory?: never; loggerOptions: KoriLoggerFactoryOptions }
  /** Use default logger configuration */
  | { loggerFactory?: never; loggerOptions?: never };

/**
 * Configuration options for creating a new Kori instance.
 *
 * Allows customization of validation, validation failure handling, routing, and logging
 * behavior. All options are optional and have sensible defaults.
 *
 * @template ReqV - Request validation configuration for type-safe request validation
 * @template ResV - Response validation configuration for type-safe response validation
 *
 * @example
 * ```typescript
 * const app = createKori({
 *   requestValidator: myRequestValidator,
 *   responseValidator: myResponseValidator,
 *   onRouteNotFound: (req) => new Response('Page not found', { status: 404 }),
 *   loggerOptions: { level: 'info' }
 * });
 * ```
 */
export type CreateKoriOptions<
  ReqV extends KoriValidatorBase | undefined = undefined,
  ResV extends KoriValidatorBase | undefined = undefined,
> = {
  /** Request validation configuration */
  requestValidator?: ReqV;
  /** Response validation configuration */
  responseValidator?: ResV;
  onRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    ReqV
  >;
  onResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    ResV
  >;
  /** Custom handler for when no route matches the request */
  onRouteNotFound?: (req: Request) => MaybePromise<Response>;
  /** Custom route matcher implementation (defaults to HonoRouteMatcher) */
  routeMatcher?: KoriRouteMatcher;
} & LoggerConfig;
