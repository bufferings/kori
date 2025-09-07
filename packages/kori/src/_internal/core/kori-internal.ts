import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../../context/index.js';
import { type KoriFetchHandler } from '../../fetch-handler/index.js';
import { type KoriOnErrorHook, type KoriOnRequestHook, type KoriOnStartHook } from '../../hook/index.js';
import { HttpStatus } from '../../http/index.js';
import { type Kori, type CreateKoriOptions } from '../../kori/index.js';
import { type KoriLogger, type KoriLoggerFactory } from '../../logging/index.js';
import { createKoriLoggerFactory, createInstanceLogger } from '../../logging/index.js';
import { type KoriPlugin } from '../../plugin/index.js';
import { type KoriRequestSchemaDefault } from '../../request-schema/index.js';
import { type KoriRequestValidatorDefault } from '../../request-validator/index.js';
import { type KoriResponseSchemaDefault } from '../../response-schema/index.js';
import { type KoriResponseValidatorDefault } from '../../response-validator/index.js';
import { type KoriRouteMatcher } from '../../route-matcher/index.js';
import { createHonoRouteMatcher } from '../../route-matcher/index.js';
import {
  type KoriHandler,
  type KoriInstanceRequestValidationFailureHandler,
  type KoriInstanceResponseValidationFailureHandler,
  type KoriRoute,
  type KoriRouteMethodOptions,
  type KoriRouteOptions,
  type RouteHttpMethod,
} from '../../routing/index.js';
import { normalizeRouteHttpMethod } from '../../routing/index.js';
import { type MaybePromise } from '../../util/index.js';

import { createFetchHandler } from './fetch-handler-creator.js';
import { joinPaths } from './path.js';
import { composeRouteHandler } from './route-handler-composer.js';
import { createRouteRegistry, type KoriRouteRegistry } from './route-registry.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Type-erased KoriInternal for heterogeneous storage */
type KoriInternalAny = KoriInternal<any, any, any, any, any>;

/** Type-erased start hook for heterogeneous storage */
type KoriOnStartHookAny = KoriOnStartHook<any, any>;
/** Type-erased request hook for heterogeneous storage */
type KoriOnRequestHookAny = KoriOnRequestHook<any, any, any, any, any>;
/** Type-erased error hook for heterogeneous storage */
type KoriOnErrorHookAny = KoriOnErrorHook<any, any, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Shared state across all Kori instances in the same tree.
 */
type KoriInternalShared = {
  /** Root instance for collecting hooks across the tree */
  root: KoriInternalAny;
  /** Route matcher for URL pattern matching */
  routeMatcher: KoriRouteMatcher;
  /** Registry for storing route handlers and metadata */
  routeRegistry: KoriRouteRegistry;
  /** Factory for creating loggers */
  loggerFactory: KoriLoggerFactory;
  /** Instance-level logger */
  instanceLogger: KoriLogger;
  /** Handler for when no route matches the request (always defined with default) */
  onRouteNotFound: (req: Request) => MaybePromise<Response>;
};

/**
 * Internal Kori instance with additional private methods.
 */
type KoriInternal<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ReqV extends KoriRequestValidatorDefault | undefined,
  ResV extends KoriResponseValidatorDefault | undefined,
> = Kori<Env, Req, Res, ReqV, ResV> & {
  /** Collect start hooks from this instance and all children */
  _collectStartHooks(): KoriOnStartHook<Env>[];
};

/**
 * Options for creating internal Kori instances.
 */
type CreateKoriInternalOptions<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ReqV extends KoriRequestValidatorDefault | undefined,
  ResV extends KoriResponseValidatorDefault | undefined,
> = {
  /** Shared state across the instance tree */
  shared: KoriInternalShared;
  /** Path prefix for child instances */
  prefix?: string;
  /** Request validator for this instance */
  requestValidator?: ReqV;
  /** Response validator for this instance */
  responseValidator?: ResV;
  /** Instance-level request validation failure handler */
  onRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<Env, Req, Res, ReqV>;
  /** Instance-level response validation failure handler */
  onResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<Env, Req, Res, ResV>;
  /** Handler hooks inherited from parent instances */
  parentHandlerHooks?: {
    requestHooks: KoriOnRequestHookAny[];
    errorHooks: KoriOnErrorHookAny[];
  };
};

/**
 * Union type for HTTP method route registration arguments.
 */
type RouteMethodOptions<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  ReqV extends KoriRequestValidatorDefault | undefined,
  ReqS extends KoriRequestSchemaDefault | undefined,
  ResV extends KoriResponseValidatorDefault | undefined,
  ResS extends KoriResponseSchemaDefault | undefined,
> =
  | KoriHandler<Env, Req, Res, Path, ReqV, undefined>
  | KoriRouteMethodOptions<Env, Req, Res, Path, ReqV, ReqS, ResV, ResS>;

/**
 * Creates an internal Kori instance with extended functionality.
 */
function createKoriInternal<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ReqV extends KoriRequestValidatorDefault | undefined,
  ResV extends KoriResponseValidatorDefault | undefined,
>(options: CreateKoriInternalOptions<Env, Req, Res, ReqV, ResV>): KoriInternal<Env, Req, Res, ReqV, ResV> {
  const _shared = options.shared;
  const _requestValidator = options.requestValidator;
  const _responseValidator = options.responseValidator;
  const _instanceOnRequestValidationFailure = options.onRequestValidationFailure;
  const _instanceOnResponseValidationFailure = options.onResponseValidationFailure;
  const _prefix = options.prefix ?? '';

  const _children: KoriInternalAny[] = [];
  const _startHooks: KoriOnStartHookAny[] = [];
  const _requestHooks: KoriOnRequestHookAny[] = [...(options.parentHandlerHooks?.requestHooks ?? [])];
  const _errorHooks: KoriOnErrorHookAny[] = [...(options.parentHandlerHooks?.errorHooks ?? [])];

  // Helper to reduce code duplication across HTTP method functions (get/post/etc.)
  const _routeAlias = <
    Path extends string,
    ReqS extends KoriRequestSchemaDefault | undefined = undefined,
    ResS extends KoriResponseSchemaDefault | undefined = undefined,
  >(
    method: RouteHttpMethod,
    path: Path,
    handlerOrOptions: RouteMethodOptions<Env, Req, Res, Path, ReqV, ReqS, ResV, ResS>,
    route: KoriRoute<Env, Req, Res, ReqV, ResV>,
  ): Kori<Env, Req, Res, ReqV, ResV> => {
    if (typeof handlerOrOptions === 'function') {
      // Type assertion to bypass provider constraints for handler-only routes
      return route({ method, path, handler: handlerOrOptions } as Parameters<typeof route>[0]);
    }
    return route({ method, path, ...handlerOrOptions });
  };

  const _internal: KoriInternal<Env, Req, Res, ReqV, ResV> = {
    _collectStartHooks() {
      const childHooks = _children.flatMap((child) => child._collectStartHooks());
      return [..._startHooks, ...childHooks] as KoriOnStartHook<Env>[];
    },

    log() {
      return _shared.instanceLogger;
    },

    onStart<EnvExt extends object>(hook: KoriOnStartHook<Env, EnvExt>) {
      _startHooks.push(hook);
      return _internal as unknown as Kori<Env & EnvExt, Req, Res, ReqV, ResV>;
    },

    onRequest<ReqExt extends object, ResExt extends object>(hook: KoriOnRequestHook<Env, Req, Res, ReqExt, ResExt>) {
      _requestHooks.push(hook);
      return _internal as unknown as Kori<Env, Req & ReqExt, Res & ResExt, ReqV, ResV>;
    },

    onError(hook) {
      _errorHooks.push(hook);
      return _internal;
    },

    applyPlugin<EnvExt extends object, ReqExt extends object, ResExt extends object>(
      plugin: KoriPlugin<Env, Req, Res, EnvExt, ReqExt, ResExt, ReqV, ResV>,
    ) {
      return plugin.apply(_internal) as unknown as Kori<Env & EnvExt, Req & ReqExt, Res & ResExt, ReqV, ResV>;
    },

    createChild<EnvExt extends object, ReqExt extends object, ResExt extends object>(childOptions: {
      prefix?: string;
      configure: (
        kori: Kori<Env, Req, Res, ReqV, ResV>,
      ) => KoriInternal<Env & EnvExt, Req & ReqExt, Res & ResExt, ReqV, ResV>;
    }) {
      const childKoriInternal: KoriInternal<Env, Req, Res, ReqV, ResV> = createKoriInternal({
        shared: _shared,
        requestValidator: _requestValidator,
        responseValidator: _responseValidator,
        onRequestValidationFailure: _instanceOnRequestValidationFailure,
        onResponseValidationFailure: _instanceOnResponseValidationFailure,
        prefix: joinPaths(_prefix, childOptions.prefix ?? ''),
        parentHandlerHooks: {
          requestHooks: _requestHooks,
          errorHooks: _errorHooks,
        },
      });
      const configuredChild = childOptions.configure(childKoriInternal);
      _children.push(configuredChild);
      return configuredChild as unknown as Kori<Env & EnvExt, Req & ReqExt, Res & ResExt, ReqV, ResV>;
    },

    route<
      Path extends string,
      ReqS extends KoriRequestSchemaDefault | undefined = undefined,
      ResS extends KoriResponseSchemaDefault | undefined = undefined,
    >(routeOptions: KoriRouteOptions<Env, Req, Res, Path, ReqV, ReqS, ResV, ResS>): Kori<Env, Req, Res, ReqV, ResV> {
      const composedHandler = composeRouteHandler({
        deps: {
          requestValidator: _requestValidator,
          responseValidator: _responseValidator,
          instanceOnRequestValidationFailure: _instanceOnRequestValidationFailure,
          instanceOnResponseValidationFailure: _instanceOnResponseValidationFailure,
          requestHooks: _requestHooks,
          errorHooks: _errorHooks,
        },
        routeParams: {
          requestSchema: routeOptions.requestSchema,
          responseSchema: routeOptions.responseSchema,
          handler: routeOptions.handler,
          routeOnRequestValidationFailure: routeOptions.onRequestValidationFailure,
          routeOnResponseValidationFailure: routeOptions.onResponseValidationFailure,
        },
      });

      const combinedPath = joinPaths(_prefix, routeOptions.path);
      const routeId = _shared.routeRegistry.register({
        method: routeOptions.method,
        path: combinedPath,
        handler: composedHandler,
        requestSchema: routeOptions.requestSchema,
        responseSchema: routeOptions.responseSchema,
        pluginMetadata: routeOptions.pluginMetadata,
      });

      const methodString = normalizeRouteHttpMethod(routeOptions.method);
      _shared.routeMatcher.addRoute({ method: methodString, path: combinedPath, routeId });

      return _internal;
    },

    get<
      Path extends string,
      ReqS extends KoriRequestSchemaDefault | undefined = undefined,
      ResS extends KoriResponseSchemaDefault | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions: RouteMethodOptions<Env, Req, Res, Path, ReqV, ReqS, ResV, ResS>,
    ): Kori<Env, Req, Res, ReqV, ResV> {
      return _routeAlias('GET', path, handlerOrOptions, _internal.route);
    },

    post<
      Path extends string,
      ReqS extends KoriRequestSchemaDefault | undefined = undefined,
      ResS extends KoriResponseSchemaDefault | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions: RouteMethodOptions<Env, Req, Res, Path, ReqV, ReqS, ResV, ResS>,
    ): Kori<Env, Req, Res, ReqV, ResV> {
      return _routeAlias('POST', path, handlerOrOptions, _internal.route);
    },

    put<
      Path extends string,
      ReqS extends KoriRequestSchemaDefault | undefined = undefined,
      ResS extends KoriResponseSchemaDefault | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions: RouteMethodOptions<Env, Req, Res, Path, ReqV, ReqS, ResV, ResS>,
    ): Kori<Env, Req, Res, ReqV, ResV> {
      return _routeAlias('PUT', path, handlerOrOptions, _internal.route);
    },

    delete<
      Path extends string,
      ReqS extends KoriRequestSchemaDefault | undefined = undefined,
      ResS extends KoriResponseSchemaDefault | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions: RouteMethodOptions<Env, Req, Res, Path, ReqV, ReqS, ResV, ResS>,
    ): Kori<Env, Req, Res, ReqV, ResV> {
      return _routeAlias('DELETE', path, handlerOrOptions, _internal.route);
    },

    patch<
      Path extends string,
      ReqS extends KoriRequestSchemaDefault | undefined = undefined,
      ResS extends KoriResponseSchemaDefault | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions: RouteMethodOptions<Env, Req, Res, Path, ReqV, ReqS, ResV, ResS>,
    ): Kori<Env, Req, Res, ReqV, ResV> {
      return _routeAlias('PATCH', path, handlerOrOptions, _internal.route);
    },

    head<
      Path extends string,
      ReqS extends KoriRequestSchemaDefault | undefined = undefined,
      ResS extends KoriResponseSchemaDefault | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions: RouteMethodOptions<Env, Req, Res, Path, ReqV, ReqS, ResV, ResS>,
    ): Kori<Env, Req, Res, ReqV, ResV> {
      return _routeAlias('HEAD', path, handlerOrOptions, _internal.route);
    },

    options<
      Path extends string,
      ReqS extends KoriRequestSchemaDefault | undefined = undefined,
      ResS extends KoriResponseSchemaDefault | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions: RouteMethodOptions<Env, Req, Res, Path, ReqV, ReqS, ResV, ResS>,
    ): Kori<Env, Req, Res, ReqV, ResV> {
      return _routeAlias('OPTIONS', path, handlerOrOptions, _internal.route);
    },

    generate(): KoriFetchHandler {
      return createFetchHandler({
        compiledRouteMatcher: _shared.routeMatcher.compile(),
        routeRegistry: _shared.routeRegistry,
        allStartHooks: _shared.root._collectStartHooks(),
        loggerFactory: _shared.loggerFactory,
        instanceLogger: _shared.instanceLogger,
        onRouteNotFound: _shared.onRouteNotFound,
      });
    },

    routeDefinitions() {
      return _shared.routeRegistry.getAll().map((route) => ({
        method: route.method,
        path: route.path,
        requestSchema: route.requestSchema,
        responseSchema: route.responseSchema,
        pluginMetadata: route.pluginMetadata,
      }));
    },
  };

  return _internal;
}

/**
 * Creates default not found handler that returns plain text response.
 *
 * @internal
 */
function createDefaultNotFoundHandler(): (req: Request) => Response {
  return (_req: Request) => new Response('Not Found', { status: HttpStatus.NOT_FOUND });
}

/**
 * Creates the root Kori instance, initializing core framework components.
 *
 * Initializes the core framework infrastructure including route matching,
 * logging, and validation systems. Used by the public createKori API.
 *
 * @template RequestValidator - Request validator type for type-safe validation
 * @template ResponseValidator - Response validator type for type-safe validation
 * @param options - Configuration options for the root instance
 * @returns Root Kori instance with framework capabilities
 */
export function createKoriRoot<
  RequestValidator extends KoriRequestValidatorDefault | undefined = undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined = undefined,
>(
  options?: CreateKoriOptions<RequestValidator, ResponseValidator>,
): Kori<KoriEnvironment, KoriRequest, KoriResponse, RequestValidator, ResponseValidator> {
  const routeMatcher = options?.routeMatcher ?? createHonoRouteMatcher();
  const loggerFactory = options?.loggerFactory ?? createKoriLoggerFactory(options?.loggerOptions);
  const instanceLogger = createInstanceLogger(loggerFactory);
  const onRouteNotFound = options?.onRouteNotFound ?? createDefaultNotFoundHandler();

  // Create shared state with placeholder root (circular reference resolved below)
  const shared = {
    routeMatcher,
    routeRegistry: createRouteRegistry(),
    loggerFactory,
    instanceLogger,
    onRouteNotFound,
  } as unknown as KoriInternalShared;

  // Create root instance with shared state
  const root = createKoriInternal<KoriEnvironment, KoriRequest, KoriResponse, RequestValidator, ResponseValidator>({
    shared,
    requestValidator: options?.requestValidator,
    responseValidator: options?.responseValidator,
    onRequestValidationFailure: options?.onRequestValidationFailure,
    onResponseValidationFailure: options?.onResponseValidationFailure,
  });

  // Complete circular reference: shared.root points to the created root
  shared.root = root;
  return root;
}
