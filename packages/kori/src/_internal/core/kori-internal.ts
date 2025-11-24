import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../../context/index.js';
import { KoriRouteDefinitionError } from '../../error/index.js';
import { type KoriFetchHandler } from '../../fetch-handler/index.js';
import { type KoriOnErrorHook, type KoriOnRequestHook, type KoriOnStartHook } from '../../hook/index.js';
import {
  type Kori,
  type CreateKoriOptions,
  type KoriRouteNotFoundHandler,
  createDefaultRouteNotFoundHandler,
} from '../../kori/index.js';
import { type KoriLogger, type KoriLoggerFactory } from '../../logging/index.js';
import { createKoriLoggerFactory, createInstanceLogger } from '../../logging/index.js';
import { type KoriPlugin } from '../../plugin/index.js';
import { type KoriRequestSchemaBase } from '../../request-schema/index.js';
import { type KoriResponseSchemaBase } from '../../response-schema/index.js';
import { type KoriRouteMatcher } from '../../route-matcher/index.js';
import { createHonoRouteMatcher } from '../../route-matcher/index.js';
import {
  type KoriRoute,
  type KoriRouteOptions,
  type RouteHttpMethod,
  type KoriInstanceRequestValidationFailureHandler,
  type KoriInstanceResponseValidationFailureHandler,
  type KoriRouteMethodImplOptions,
} from '../../routing/index.js';
import { normalizeRouteHttpMethod } from '../../routing/index.js';
import { type KoriValidatorBase } from '../../validator/index.js';

import { createFetchHandler } from './fetch-handler-creator.js';
import { joinPaths, hasNonTrailingOptionalParam } from './path.js';
import { composeRouteHandler } from './route-handler-composer.js';
import { createRouteRegistry, type KoriRouteRegistry } from './route-registry.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type KoriInternalAny = KoriInternal<any, any, any, any, any>;
type KoriOnStartHookAny = KoriOnStartHook<any, any>;
type KoriOnRequestHookAny = KoriOnRequestHook<any, any, any, any, any>;
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
  /** Handler for unmatched routes */
  onRouteNotFound: KoriRouteNotFoundHandler;
};

/**
 * Internal Kori instance with additional private methods.
 */
type KoriInternal<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ReqV extends KoriValidatorBase | undefined = undefined,
  ResV extends KoriValidatorBase | undefined = undefined,
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
  ReqV extends KoriValidatorBase | undefined,
  ResV extends KoriValidatorBase | undefined,
> = {
  /** Shared state across the instance tree */
  shared: KoriInternalShared;
  /** Path prefix for child instances */
  prefix?: string;
  /** Request validator */
  requestValidator?: ReqV;
  /** Response validator */
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
 * Creates an internal Kori instance.
 */
function createKoriInternal<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ReqV extends KoriValidatorBase | undefined = undefined,
  ResV extends KoriValidatorBase | undefined = undefined,
>(options: CreateKoriInternalOptions<Env, Req, Res, ReqV, ResV>): KoriInternal<Env, Req, Res, ReqV, ResV> {
  const _shared = options.shared;
  const _prefix = options.prefix ?? '';
  const _requestValidator = options.requestValidator;
  const _responseValidator = options.responseValidator;
  const _instanceOnRequestValidationFailure = options.onRequestValidationFailure;
  const _instanceOnResponseValidationFailure = options.onResponseValidationFailure;

  const _children: KoriInternalAny[] = [];
  const _startHooks: KoriOnStartHookAny[] = [];
  const _requestHooks: KoriOnRequestHookAny[] = [...(options.parentHandlerHooks?.requestHooks ?? [])];
  const _errorHooks: KoriOnErrorHookAny[] = [...(options.parentHandlerHooks?.errorHooks ?? [])];

  // Helper to reduce code duplication across HTTP method functions (get/post/etc.)
  const _routeAlias = <
    Path extends string,
    ReqS extends KoriRequestSchemaBase | undefined = undefined,
    ResS extends KoriResponseSchemaBase | undefined = undefined,
  >(
    method: RouteHttpMethod,
    path: Path,
    handlerOrOptions: KoriRouteMethodImplOptions<Env, Req, Res, Path, ReqV, ResV, ReqS, ResS>,
    route: KoriRoute<Env, Req, Res, ReqV, ResV>,
  ): Kori<Env, Req, Res, ReqV, ResV> => {
    if (typeof handlerOrOptions === 'function') {
      // Type assertion to bypass provider constraints for handler-only routes
      return route({ method, path, handler: handlerOrOptions } as Parameters<typeof route>[0]);
    }
    return route({ method, path, ...handlerOrOptions });
  };

  const _kori: KoriInternal<Env, Req, Res, ReqV, ResV> = {
    _collectStartHooks() {
      const childHooks = _children.flatMap((child) => child._collectStartHooks());
      return [..._startHooks, ...childHooks] as KoriOnStartHook<Env>[];
    },

    log() {
      return _shared.instanceLogger;
    },

    onStart<EnvExt extends object>(hook: KoriOnStartHook<Env, EnvExt>) {
      _startHooks.push(hook);
      return _kori as unknown as Kori<Env & EnvExt, Req, Res, ReqV, ResV>;
    },

    onRequest<ReqExt extends object, ResExt extends object>(hook: KoriOnRequestHook<Env, Req, Res, ReqExt, ResExt>) {
      _requestHooks.push(hook);
      return _kori as unknown as Kori<Env, Req & ReqExt, Res & ResExt, ReqV, ResV>;
    },

    onError(hook) {
      _errorHooks.push(hook);
      return _kori;
    },

    applyPlugin<EnvExt extends object, ReqExt extends object, ResExt extends object>(
      plugin: KoriPlugin<Env, Req, Res, EnvExt, ReqExt, ResExt, ReqV, ResV>,
    ) {
      return plugin.apply(_kori) as unknown as Kori<Env & EnvExt, Req & ReqExt, Res & ResExt, ReqV, ResV>;
    },

    createChild<EnvExt extends object, ReqExt extends object, ResExt extends object>(childOptions: {
      prefix?: string;
      configure: (
        kori: Kori<Env, Req, Res, ReqV, ResV>,
      ) => KoriInternal<Env & EnvExt, Req & ReqExt, Res & ResExt, ReqV, ResV>;
    }) {
      const child: KoriInternal<Env, Req, Res, ReqV, ResV> = createKoriInternal({
        shared: _shared,
        prefix: joinPaths(_prefix, childOptions.prefix ?? ''),
        requestValidator: _requestValidator,
        responseValidator: _responseValidator,
        onRequestValidationFailure: _instanceOnRequestValidationFailure,
        onResponseValidationFailure: _instanceOnResponseValidationFailure,
        parentHandlerHooks: {
          requestHooks: _requestHooks,
          errorHooks: _errorHooks,
        },
      });
      const configuredChild = childOptions.configure(child);
      _children.push(configuredChild);
      return configuredChild as unknown as Kori<Env & EnvExt, Req & ReqExt, Res & ResExt, ReqV, ResV>;
    },

    route<
      Path extends string,
      ReqS extends KoriRequestSchemaBase | undefined = undefined,
      ResS extends KoriResponseSchemaBase | undefined = undefined,
    >(routeOptions: KoriRouteOptions<Env, Req, Res, Path, ReqV, ResV, ReqS, ResS>): Kori<Env, Req, Res, ReqV, ResV> {
      const composedHandler = composeRouteHandler({
        instanceOptions: {
          requestHooks: _requestHooks,
          errorHooks: _errorHooks,
          requestValidator: _requestValidator,
          responseValidator: _responseValidator,
          instanceOnRequestValidationFailure: _instanceOnRequestValidationFailure,
          instanceOnResponseValidationFailure: _instanceOnResponseValidationFailure,
        },
        routeOptions: {
          requestSchema: routeOptions.requestSchema,
          responseSchema: routeOptions.responseSchema,
          handler: routeOptions.handler,
          routeOnRequestValidationFailure: routeOptions.onRequestValidationFailure,
          routeOnResponseValidationFailure: routeOptions.onResponseValidationFailure,
        },
      });

      const combinedPath = joinPaths(_prefix, routeOptions.path);
      const methods = Array.isArray(routeOptions.method) ? routeOptions.method : [routeOptions.method];

      for (const method of methods) {
        const methodString = normalizeRouteHttpMethod(method);

        if (hasNonTrailingOptionalParam(combinedPath)) {
          throw new KoriRouteDefinitionError(
            'Kori does not support optional parameters ":param?" in the middle of paths.',
            { method: methodString, path: combinedPath },
          );
        }

        const routeId = _shared.routeRegistry.register({
          method,
          path: combinedPath,
          handler: composedHandler,
          requestSchema: routeOptions.requestSchema,
          responseSchema: routeOptions.responseSchema,
          pluginMeta: routeOptions.pluginMeta,
        });

        _shared.routeMatcher.addRoute({ method: methodString, path: combinedPath, routeId });
      }

      return _kori;
    },

    get<
      Path extends string,
      ReqS extends KoriRequestSchemaBase | undefined = undefined,
      ResS extends KoriResponseSchemaBase | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions: KoriRouteMethodImplOptions<Env, Req, Res, Path, ReqV, ResV, ReqS, ResS>,
    ): Kori<Env, Req, Res, ReqV, ResV> {
      return _routeAlias('GET', path, handlerOrOptions, _kori.route);
    },

    post<
      Path extends string,
      ReqS extends KoriRequestSchemaBase | undefined = undefined,
      ResS extends KoriResponseSchemaBase | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions: KoriRouteMethodImplOptions<Env, Req, Res, Path, ReqV, ResV, ReqS, ResS>,
    ): Kori<Env, Req, Res, ReqV, ResV> {
      return _routeAlias('POST', path, handlerOrOptions, _kori.route);
    },

    put<
      Path extends string,
      ReqS extends KoriRequestSchemaBase | undefined = undefined,
      ResS extends KoriResponseSchemaBase | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions: KoriRouteMethodImplOptions<Env, Req, Res, Path, ReqV, ResV, ReqS, ResS>,
    ): Kori<Env, Req, Res, ReqV, ResV> {
      return _routeAlias('PUT', path, handlerOrOptions, _kori.route);
    },

    delete<
      Path extends string,
      ReqS extends KoriRequestSchemaBase | undefined = undefined,
      ResS extends KoriResponseSchemaBase | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions: KoriRouteMethodImplOptions<Env, Req, Res, Path, ReqV, ResV, ReqS, ResS>,
    ): Kori<Env, Req, Res, ReqV, ResV> {
      return _routeAlias('DELETE', path, handlerOrOptions, _kori.route);
    },

    patch<
      Path extends string,
      ReqS extends KoriRequestSchemaBase | undefined = undefined,
      ResS extends KoriResponseSchemaBase | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions: KoriRouteMethodImplOptions<Env, Req, Res, Path, ReqV, ResV, ReqS, ResS>,
    ): Kori<Env, Req, Res, ReqV, ResV> {
      return _routeAlias('PATCH', path, handlerOrOptions, _kori.route);
    },

    head<
      Path extends string,
      ReqS extends KoriRequestSchemaBase | undefined = undefined,
      ResS extends KoriResponseSchemaBase | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions: KoriRouteMethodImplOptions<Env, Req, Res, Path, ReqV, ResV, ReqS, ResS>,
    ): Kori<Env, Req, Res, ReqV, ResV> {
      return _routeAlias('HEAD', path, handlerOrOptions, _kori.route);
    },

    options<
      Path extends string,
      ReqS extends KoriRequestSchemaBase | undefined = undefined,
      ResS extends KoriResponseSchemaBase | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions: KoriRouteMethodImplOptions<Env, Req, Res, Path, ReqV, ResV, ReqS, ResS>,
    ): Kori<Env, Req, Res, ReqV, ResV> {
      return _routeAlias('OPTIONS', path, handlerOrOptions, _kori.route);
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

    async start() {
      return this.generate().onStart();
    },

    routeDefinitions() {
      return _shared.routeRegistry.getAll().map((route) => ({
        method: route.method,
        path: route.path,
        requestSchema: route.requestSchema,
        responseSchema: route.responseSchema,
        pluginMeta: route.pluginMeta,
      }));
    },
  };

  return _kori;
}

/**
 * Creates the root Kori instance, initializing core framework infrastructure
 * such as route matching, logging, and validation systems.
 *
 * @template ReqV - Request validator type for type-safe request validation
 * @template ResV - Response validator type for type-safe response validation
 *
 * @param options - Configuration options for the root instance
 * @returns Root Kori instance with framework capabilities
 */
export function createKoriRoot<
  ReqV extends KoriValidatorBase | undefined = undefined,
  ResV extends KoriValidatorBase | undefined = undefined,
>(options?: CreateKoriOptions<ReqV, ResV>): Kori<KoriEnvironment, KoriRequest, KoriResponse, ReqV, ResV> {
  const routeMatcher = options?.routeMatcher ?? createHonoRouteMatcher();
  const loggerFactory = options?.loggerFactory ?? createKoriLoggerFactory(options?.loggerOptions);
  const onRouteNotFound = options?.onRouteNotFound ?? createDefaultRouteNotFoundHandler();

  const instanceLogger = createInstanceLogger(loggerFactory);
  const routeRegistry = createRouteRegistry();

  // Create shared state with placeholder root (circular reference resolved below)
  const shared = {
    routeMatcher,
    routeRegistry,
    loggerFactory,
    instanceLogger,
    onRouteNotFound,
  } as unknown as KoriInternalShared;

  // Create root instance with shared state
  const root = createKoriInternal<KoriEnvironment, KoriRequest, KoriResponse, ReqV, ResV>({
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
