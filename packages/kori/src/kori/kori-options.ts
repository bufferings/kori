import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../context/index.js';
import { type KoriLoggerFactoryOptions, type KoriLoggerFactory } from '../logging/index.js';
import { type KoriRequestValidatorDefault } from '../request-validator/index.js';
import { type KoriResponseValidatorDefault } from '../response-validator/index.js';
import { type KoriRouteMatcher } from '../route-matcher/index.js';
import {
  type KoriInstanceRequestValidationErrorHandler,
  type KoriInstanceResponseValidationErrorHandler,
} from '../routing/index.js';

/**
 * Logger configuration options with mutually exclusive choices.
 *
 * Provides three ways to configure logging: use an existing factory,
 * create a factory from options, or use default configuration.
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
 * Allows customization of validation, error handling, routing, and logging
 * behavior. All options are optional and have sensible defaults.
 *
 * @template RequestValidator - Request validator for type-safe validation
 * @template ResponseValidator - Response validator for type-safe validation
 *
 * @example
 * ```typescript
 * const app = createKori({
 *   requestValidator: myRequestValidator,
 *   onRequestValidationError: (ctx, err) => ctx.res.badRequest(),
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
  /** Instance-level error handler for request validation failures */
  onRequestValidationError?: KoriInstanceRequestValidationErrorHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    RequestValidator
  >;
  /** Instance-level error handler for response validation failures */
  onResponseValidationError?: KoriInstanceResponseValidationErrorHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    ResponseValidator
  >;
  /** Custom route matcher implementation */
  routeMatcher?: KoriRouteMatcher;
} & LoggerConfig;
