import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../context/index.js';
import { type Kori } from '../kori/index.js';
import { type KoriRequestSchemaDefault } from '../request-schema/index.js';
import { type KoriRequestValidatorDefault } from '../request-validator/index.js';
import { type KoriResponseSchemaDefault } from '../response-schema/index.js';
import { type KoriResponseValidatorDefault } from '../response-validator/index.js';

import { type KoriHandler } from './handler.js';
import { type RequestProviderConstraint, type ResponseProviderConstraint } from './provider-constraint.js';
import { type KoriRouteRequestValidationErrorHandler } from './request-validation-error-handler.js';
import { type KoriRouteResponseValidationErrorHandler } from './response-validation-error-handler.js';
import { type RouteHttpMethod } from './route-http-method.js';

/**
 * Plugin metadata storage for route-specific data.
 *
 * Allows plugins to attach custom metadata to routes using symbol keys
 * for namespace isolation. Plugins can store configuration, documentation,
 * or processing hints without conflicts.
 *
 * @example
 * ```typescript
 * const MyPluginKey = Symbol('my-plugin');
 * const metadata: KoriRoutePluginMetadata = {
 *   [MyPluginKey]: { priority: 'high', cache: true }
 * };
 * ```
 */
export type KoriRoutePluginMetadata = Record<symbol, unknown>;

/**
 * Generic route registration function for any HTTP method.
 *
 * Provides full control over route configuration including HTTP method,
 * path pattern, validation schemas, error handlers, and plugin metadata.
 * Used internally by method-specific shortcuts (get, post, etc.).
 *
 * @template Env - Environment type containing instance-specific data
 * @template Req - Request type with request-specific data and methods
 * @template Res - Response type with response building capabilities
 * @template RequestValidator - Request validator for type-safe validation
 * @template ResponseValidator - Response validator for type-safe validation
 *
 * @example
 * ```typescript
 * // Basic route registration
 * app.route({
 *   method: 'POST',
 *   path: '/users',
 *   handler: (ctx) => ctx.res.json({ id: generateId() })
 * });
 *
 * // Route with validation
 * app.route({
 *   method: 'PUT',
 *   path: '/users/:id',
 *   requestSchema: userUpdateSchema,
 *   responseSchema: userResponseSchema,
 *   handler: (ctx) => {
 *     const userData = ctx.req.validatedBody();
 *     return ctx.res.json(updateUser(userData));
 *   }
 * });
 * ```
 */
export type KoriRoute<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
> = <
  Path extends string,
  RequestSchema extends KoriRequestSchemaDefault | undefined = undefined,
  ResponseSchema extends KoriResponseSchemaDefault | undefined = undefined,
>(
  options: {
    /** HTTP method for this route */
    method: RouteHttpMethod;
    /** URL path pattern with parameter placeholders */
    path: Path;
    /** Optional request schema for validation */
    requestSchema?: RequestSchema;
    /** Optional response schema for validation */
    responseSchema?: ResponseSchema;
    /** Route handler function */
    handler: KoriHandler<Env, Req, Res, Path, RequestValidator, RequestSchema>;
    /** Custom error handler for request validation failures */
    onRequestValidationError?: KoriRouteRequestValidationErrorHandler<
      Env,
      Req,
      Res,
      Path,
      RequestValidator,
      RequestSchema
    >;
    /** Custom error handler for response validation failures */
    onResponseValidationError?: KoriRouteResponseValidationErrorHandler<
      Env,
      Req,
      Res,
      Path,
      ResponseValidator,
      ResponseSchema
    >;
    /** Optional metadata for plugins */
    pluginMetadata?: KoriRoutePluginMetadata;
  } & RequestProviderConstraint<RequestValidator, RequestSchema> &
    ResponseProviderConstraint<ResponseValidator, ResponseSchema>,
) => Kori<Env, Req, Res, RequestValidator, ResponseValidator>;

/**
 * HTTP method-specific route registration function.
 *
 * Provides convenient shortcuts for common HTTP methods (GET, POST, etc.)
 * with simplified syntax. Supports both simple handler-only registration
 * and full configuration with validation and error handling.
 *
 * @template Env - Environment type containing instance-specific data
 * @template Req - Request type with request-specific data and methods
 * @template Res - Response type with response building capabilities
 * @template RequestValidator - Request validator for type-safe validation
 * @template ResponseValidator - Response validator for type-safe validation
 *
 * @example
 * ```typescript
 * // Simple handler
 * app.get('/health', (ctx) => ctx.res.text('OK'));
 *
 * // With validation
 * app.post('/users', {
 *   requestSchema: userCreateSchema,
 *   handler: (ctx) => {
 *     const userData = ctx.req.validatedBody();
 *     return ctx.res.json(createUser(userData));
 *   }
 * });
 * ```
 */
export type KoriRouteMethod<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
> = {
  <Path extends string>(
    path: Path,
    handler: KoriHandler<Env, Req, Res, Path, RequestValidator, undefined>,
  ): Kori<Env, Req, Res, RequestValidator, ResponseValidator>;

  <
    Path extends string,
    RequestSchema extends KoriRequestSchemaDefault | undefined = undefined,
    ResponseSchema extends KoriResponseSchemaDefault | undefined = undefined,
  >(
    path: Path,
    options: {
      /** Optional request schema for validation */
      requestSchema?: RequestSchema;
      /** Optional response schema for validation */
      responseSchema?: ResponseSchema;
      /** Route handler function */
      handler: KoriHandler<Env, Req, Res, Path, RequestValidator, RequestSchema>;
      /** Custom error handler for request validation failures */
      onRequestValidationError?: KoriRouteRequestValidationErrorHandler<
        Env,
        Req,
        Res,
        Path,
        RequestValidator,
        RequestSchema
      >;
      /** Custom error handler for response validation failures */
      onResponseValidationError?: KoriRouteResponseValidationErrorHandler<
        Env,
        Req,
        Res,
        Path,
        ResponseValidator,
        ResponseSchema
      >;
      /** Optional metadata for plugins */
      pluginMetadata?: KoriRoutePluginMetadata;
    } & RequestProviderConstraint<RequestValidator, RequestSchema> &
      ResponseProviderConstraint<ResponseValidator, ResponseSchema>,
  ): Kori<Env, Req, Res, RequestValidator, ResponseValidator>;
};
