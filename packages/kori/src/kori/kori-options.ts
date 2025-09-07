import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../context/index.js';
import { type KoriLoggerFactoryOptions, type KoriLoggerFactory } from '../logging/index.js';
import { type KoriRequestValidatorDefault } from '../request-validator/index.js';
import { type KoriResponseValidatorDefault } from '../response-validator/index.js';
import { type KoriRouteMatcher } from '../route-matcher/index.js';
import {
  type KoriInstanceRequestValidationFailureHandler,
  type KoriInstanceResponseValidationFailureHandler,
} from '../routing/index.js';
import { type MaybePromise } from '../util/index.js';

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
 * @template RequestValidator - Request validator for type-safe validation
 * @template ResponseValidator - Response validator for type-safe validation
 *
 * @example
 * ```typescript
 * const app = createKori({
 *   requestValidator: myRequestValidator,
 *   onRequestValidationFailure: (ctx, err) => ctx.res.badRequest(),
 *   onRouteNotFound: (req) => new Response('Page not found', { status: 404 }),
 *   loggerOptions: { level: 'info' }
 * });
 * ```
 */
export type CreateKoriOptions<
  RequestValidator extends KoriRequestValidatorDefault | undefined = undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined = undefined,
> = {
  /** Request validator for automatic request validation */
  requestValidator?: RequestValidator;
  /** Response validator for automatic response validation */
  responseValidator?: ResponseValidator;
  /** Instance-level failure handler for request validation failures */
  onRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    RequestValidator
  >;
  /** Instance-level failure handler for response validation failures */
  onResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    ResponseValidator
  >;
  /** Custom handler for when no route matches the request */
  onRouteNotFound?: (req: Request) => MaybePromise<Response>;
  /** Custom route matcher implementation (defaults to HonoRouteMatcher) */
  routeMatcher?: KoriRouteMatcher;
} & LoggerConfig;
