import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../context/index.js';
import { type KoriFetchHandler } from '../fetch-handler/index.js';
import {
  type KoriOnCloseHook,
  type KoriOnErrorHook,
  type KoriOnFinallyHook,
  type KoriOnInitHook,
  type KoriOnRequestHook,
  type KoriOnResponseHook,
} from '../hook/index.js';
import { getMethodString } from '../http/index.js';
import { type KoriLogger } from '../logging/index.js';
import { type KoriPlugin } from '../plugin/index.js';
import { type KoriRequestValidatorDefault } from '../request-validation/index.js';
import { type KoriResponseValidatorDefault } from '../response-validation/index.js';
import { type KoriRouter, type KoriRouterHandler } from '../router/index.js';
import { type KoriRequestSchemaDefault, type KoriResponseSchemaDefault } from '../schema/index.js';

import { createFetchHandler } from './fetch-handler-factory.js';
import { type Kori, type KoriRouteDefinition } from './kori.js';
import { createRouteHandler } from './route-handler-factory.js';
import { type RequestProviderCompatibility, type ResponseProviderCompatibility } from './route-options.js';
import {
  type HttpMethod,
  type KoriHandler,
  type KoriInstanceRequestValidationErrorHandler,
  type KoriInstanceResponseValidationErrorHandler,
  type KoriRoutePluginMetadata,
  type KoriRouteRequestValidationErrorHandler,
  type KoriRouteResponseValidationErrorHandler,
} from './route.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type KoriRouterHandlerAny = KoriRouterHandler<any, any, any>;
type KoriInternalAny = KoriInternal<any, any, any, any, any>;

type KoriOnInitHookAny = KoriOnInitHook<any, any>;
type KoriOnCloseHookAny = KoriOnCloseHook<any>;
type KoriOnRequestHookAny = KoriOnRequestHook<any, any, any, any, any>;
type KoriOnResponseHookAny = KoriOnResponseHook<any, any, any>;
type KoriOnErrorHookAny = KoriOnErrorHook<any, any, any>;
type KoriOnFinallyHookAny = KoriOnFinallyHook<any, any, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export type KoriInternalShared = {
  root: KoriInternalAny;
  router: KoriRouter;
  rootLogger: KoriLogger;
  applicationLogger: KoriLogger;
  systemLogger: KoriLogger;
};

export type KoriInternal<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
> = Kori<Env, Req, Res, RequestValidator, ResponseValidator> & {
  _collectInitHooks(): KoriOnInitHook<Env, unknown>[];
  _collectCloseHooks(): KoriOnCloseHook<Env>[];
  _collectRouteDefinitions(): KoriRouteDefinition[];
};

export function createKoriInternal<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
>({
  shared,
  requestValidator,
  responseValidator,
  onRequestValidationError,
  onResponseValidationError,
  prefix = '',
  parentHandlerHooks = {
    requestHooks: [],
    responseHooks: [],
    errorHooks: [],
    finallyHooks: [],
  },
}: {
  shared: KoriInternalShared;
  requestValidator?: RequestValidator;
  responseValidator?: ResponseValidator;
  onRequestValidationError?: KoriInstanceRequestValidationErrorHandler<Env, Req, Res, RequestValidator>;
  onResponseValidationError?: KoriInstanceResponseValidationErrorHandler<Env, Req, Res, ResponseValidator>;
  prefix?: string;
  parentHandlerHooks?: {
    requestHooks: KoriOnRequestHookAny[];
    responseHooks: KoriOnResponseHookAny[];
    errorHooks: KoriOnErrorHookAny[];
    finallyHooks: KoriOnFinallyHookAny[];
  };
}): KoriInternal<Env, Req, Res, RequestValidator, ResponseValidator> {
  const _shared = shared;
  const _requestValidator = requestValidator;
  const _responseValidator = responseValidator;
  const _onRequestValidationError = onRequestValidationError;
  const _onResponseValidationError = onResponseValidationError;
  const _prefix = prefix;

  const _children: KoriInternalAny[] = [];

  const _routeDefinitions: KoriRouteDefinition[] = [];

  const _initHooks: KoriOnInitHookAny[] = [];
  const _closeHooks: KoriOnCloseHookAny[] = [];

  const _requestHooks: KoriOnRequestHookAny[] = [...parentHandlerHooks.requestHooks];
  const _responseHooks: KoriOnResponseHookAny[] = [...parentHandlerHooks.responseHooks];
  const _errorHooks: KoriOnErrorHookAny[] = [...parentHandlerHooks.errorHooks];
  const _finallyHooks: KoriOnFinallyHookAny[] = [...parentHandlerHooks.finallyHooks];

  const _internal: KoriInternal<Env, Req, Res, RequestValidator, ResponseValidator> = {
    log() {
      return _shared.applicationLogger;
    },

    _collectInitHooks() {
      const childHooks = _children.flatMap((child) => child._collectInitHooks());
      return [..._initHooks, ...childHooks] as KoriOnInitHook<Env, unknown>[];
    },
    _collectCloseHooks() {
      const childHooks = _children.flatMap((child) => child._collectCloseHooks());
      return [..._closeHooks, ...childHooks];
    },

    _collectRouteDefinitions() {
      const childDefinitions = _children.flatMap((child) => child._collectRouteDefinitions());
      return [..._routeDefinitions, ...childDefinitions];
    },

    onInit<EnvExt>(hook: KoriOnInitHook<Env, EnvExt>) {
      _initHooks.push(hook);
      return _internal as unknown as Kori<Env & EnvExt, Req, Res, RequestValidator, ResponseValidator>;
    },
    onClose(hook) {
      _closeHooks.push(hook);
      return _internal;
    },

    onRequest<ReqExt, ResExt>(hook: KoriOnRequestHook<Env, Req, Res, ReqExt, ResExt>) {
      _requestHooks.push(hook);
      return _internal as unknown as Kori<Env, Req & ReqExt, Res & ResExt, RequestValidator, ResponseValidator>;
    },
    onResponse(hook) {
      _responseHooks.push(hook);
      return _internal;
    },
    onError(hook) {
      _errorHooks.push(hook);
      return _internal;
    },
    onFinally(hook) {
      _finallyHooks.push(hook);
      return _internal;
    },

    applyPlugin<EnvExt, ReqExt, ResExt>(
      plugin: KoriPlugin<Env, Req, Res, EnvExt, ReqExt, ResExt, RequestValidator, ResponseValidator>,
    ) {
      return plugin.apply(_internal) as unknown as Kori<
        Env & EnvExt,
        Req & ReqExt,
        Res & ResExt,
        RequestValidator,
        ResponseValidator
      >;
    },

    createChild<EnvExt, ReqExt, ResExt>(childOptions: {
      configure: (
        kori: Kori<Env, Req, Res, RequestValidator, ResponseValidator>,
      ) => KoriInternal<Env & EnvExt, Req & ReqExt, Res & ResExt, RequestValidator, ResponseValidator>;
      prefix?: string;
    }) {
      const childKoriInternal: KoriInternal<Env, Req, Res, RequestValidator, ResponseValidator> = createKoriInternal({
        shared: _shared,
        requestValidator: _requestValidator,
        responseValidator: _responseValidator,
        onRequestValidationError: _onRequestValidationError,
        onResponseValidationError: _onResponseValidationError,
        prefix: `${_prefix}${childOptions.prefix ?? ''}`,
        parentHandlerHooks: {
          requestHooks: _requestHooks,
          responseHooks: _responseHooks,
          errorHooks: _errorHooks,
          finallyHooks: _finallyHooks,
        },
      });
      const configuredChild = childOptions.configure(childKoriInternal);
      _children.push(configuredChild);
      return configuredChild as unknown as Kori<
        Env & EnvExt,
        Req & ReqExt,
        Res & ResExt,
        RequestValidator,
        ResponseValidator
      >;
    },

    addRoute<
      Path extends string,
      RequestSchema extends KoriRequestSchemaDefault | undefined = undefined,
      ResponseSchema extends KoriResponseSchemaDefault | undefined = undefined,
    >({
      method,
      path,
      requestSchema,
      responseSchema,
      handler,
      onRequestValidationError,
      onResponseValidationError,
      pluginMetadata,
    }: {
      method: HttpMethod;
      path: Path;
      requestSchema?: RequestSchema;
      responseSchema?: ResponseSchema;
      handler: KoriHandler<Env, Req, Res, Path, RequestValidator, RequestSchema>;
      onRequestValidationError?: KoriRouteRequestValidationErrorHandler<
        Env,
        Req,
        Res,
        Path,
        RequestValidator,
        RequestSchema
      >;
      onResponseValidationError?: KoriRouteResponseValidationErrorHandler<
        Env,
        Req,
        Res,
        Path,
        ResponseValidator,
        ResponseSchema
      >;
      pluginMetadata?: KoriRoutePluginMetadata;
    }): Kori<Env, Req, Res, RequestValidator, ResponseValidator> {
      const routeHandler = createRouteHandler<
        Env,
        Req,
        Res,
        Path,
        RequestValidator,
        ResponseValidator,
        RequestSchema,
        ResponseSchema
      >(
        {
          requestValidator: _requestValidator,
          responseValidator: _responseValidator,
          onRequestValidationError: _onRequestValidationError,
          onResponseValidationError: _onResponseValidationError,
          requestHooks: _requestHooks,
          responseHooks: _responseHooks,
          errorHooks: _errorHooks,
          finallyHooks: _finallyHooks,
        },
        {
          requestSchema,
          responseSchema,
          handler,
          onRequestValidationError,
          onResponseValidationError,
        },
      );

      const combinedPath = `${_prefix}${path}`;
      const methodString = getMethodString(method);

      _shared.router.addRoute({
        method: methodString,
        path: combinedPath,
        handler: routeHandler as unknown as KoriRouterHandlerAny,
      });

      _routeDefinitions.push({
        method,
        path: combinedPath,
        requestSchema,
        responseSchema,
        pluginMetadata,
      });

      return _internal;
    },

    get<
      Path extends string,
      RequestSchema extends KoriRequestSchemaDefault | undefined = undefined,
      ResponseSchema extends KoriResponseSchemaDefault | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions:
        | KoriHandler<Env, Req, Res, Path, RequestValidator, undefined>
        | ({
            requestSchema?: RequestSchema;
            responseSchema?: ResponseSchema;
            handler: KoriHandler<Env, Req, Res, Path, RequestValidator, RequestSchema>;
            routeRequestValidationErrorHandler?: KoriRouteRequestValidationErrorHandler<
              Env,
              Req,
              Res,
              Path,
              RequestValidator,
              RequestSchema
            >;
            routeResponseValidationErrorHandler?: KoriRouteResponseValidationErrorHandler<
              Env,
              Req,
              Res,
              Path,
              ResponseValidator,
              ResponseSchema
            >;
            pluginMetadata?: KoriRoutePluginMetadata;
          } & RequestProviderCompatibility<RequestValidator, RequestSchema> &
            ResponseProviderCompatibility<ResponseValidator, ResponseSchema>),
    ): Kori<Env, Req, Res, RequestValidator, ResponseValidator> {
      if (typeof handlerOrOptions === 'function') {
        return _internal.addRoute({
          method: 'GET' as const,
          path,
          handler: handlerOrOptions,
        } as Parameters<typeof _internal.addRoute>[0]);
      } else {
        return _internal.addRoute({
          method: 'GET' as const,
          path,
          ...handlerOrOptions,
        } as Parameters<typeof _internal.addRoute>[0]);
      }
    },

    post<
      Path extends string,
      RequestSchema extends KoriRequestSchemaDefault | undefined = undefined,
      ResponseSchema extends KoriResponseSchemaDefault | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions:
        | KoriHandler<Env, Req, Res, Path, RequestValidator, undefined>
        | ({
            requestSchema?: RequestSchema;
            responseSchema?: ResponseSchema;
            handler: KoriHandler<Env, Req, Res, Path, RequestValidator, RequestSchema>;
            routeRequestValidationErrorHandler?: KoriRouteRequestValidationErrorHandler<
              Env,
              Req,
              Res,
              Path,
              RequestValidator,
              RequestSchema
            >;
            routeResponseValidationErrorHandler?: KoriRouteResponseValidationErrorHandler<
              Env,
              Req,
              Res,
              Path,
              ResponseValidator,
              ResponseSchema
            >;
            pluginMetadata?: KoriRoutePluginMetadata;
          } & RequestProviderCompatibility<RequestValidator, RequestSchema> &
            ResponseProviderCompatibility<ResponseValidator, ResponseSchema>),
    ): Kori<Env, Req, Res, RequestValidator, ResponseValidator> {
      if (typeof handlerOrOptions === 'function') {
        return _internal.addRoute({
          method: 'POST' as const,
          path,
          handler: handlerOrOptions,
        } as Parameters<typeof _internal.addRoute>[0]);
      } else {
        return _internal.addRoute({
          method: 'POST' as const,
          path,
          ...handlerOrOptions,
        } as Parameters<typeof _internal.addRoute>[0]);
      }
    },

    put<
      Path extends string,
      RequestSchema extends KoriRequestSchemaDefault | undefined = undefined,
      ResponseSchema extends KoriResponseSchemaDefault | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions:
        | KoriHandler<Env, Req, Res, Path, RequestValidator, undefined>
        | ({
            requestSchema?: RequestSchema;
            responseSchema?: ResponseSchema;
            handler: KoriHandler<Env, Req, Res, Path, RequestValidator, RequestSchema>;
            routeRequestValidationErrorHandler?: KoriRouteRequestValidationErrorHandler<
              Env,
              Req,
              Res,
              Path,
              RequestValidator,
              RequestSchema
            >;
            routeResponseValidationErrorHandler?: KoriRouteResponseValidationErrorHandler<
              Env,
              Req,
              Res,
              Path,
              ResponseValidator,
              ResponseSchema
            >;
            pluginMetadata?: KoriRoutePluginMetadata;
          } & RequestProviderCompatibility<RequestValidator, RequestSchema> &
            ResponseProviderCompatibility<ResponseValidator, ResponseSchema>),
    ): Kori<Env, Req, Res, RequestValidator, ResponseValidator> {
      if (typeof handlerOrOptions === 'function') {
        return _internal.addRoute({
          method: 'PUT' as const,
          path,
          handler: handlerOrOptions,
        } as Parameters<typeof _internal.addRoute>[0]);
      } else {
        return _internal.addRoute({
          method: 'PUT' as const,
          path,
          ...handlerOrOptions,
        } as Parameters<typeof _internal.addRoute>[0]);
      }
    },

    delete<
      Path extends string,
      RequestSchema extends KoriRequestSchemaDefault | undefined = undefined,
      ResponseSchema extends KoriResponseSchemaDefault | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions:
        | KoriHandler<Env, Req, Res, Path, RequestValidator, undefined>
        | ({
            requestSchema?: RequestSchema;
            responseSchema?: ResponseSchema;
            handler: KoriHandler<Env, Req, Res, Path, RequestValidator, RequestSchema>;
            routeRequestValidationErrorHandler?: KoriRouteRequestValidationErrorHandler<
              Env,
              Req,
              Res,
              Path,
              RequestValidator,
              RequestSchema
            >;
            routeResponseValidationErrorHandler?: KoriRouteResponseValidationErrorHandler<
              Env,
              Req,
              Res,
              Path,
              ResponseValidator,
              ResponseSchema
            >;
            pluginMetadata?: KoriRoutePluginMetadata;
          } & RequestProviderCompatibility<RequestValidator, RequestSchema> &
            ResponseProviderCompatibility<ResponseValidator, ResponseSchema>),
    ): Kori<Env, Req, Res, RequestValidator, ResponseValidator> {
      if (typeof handlerOrOptions === 'function') {
        return _internal.addRoute({
          method: 'DELETE' as const,
          path,
          handler: handlerOrOptions,
        } as Parameters<typeof _internal.addRoute>[0]);
      } else {
        return _internal.addRoute({
          method: 'DELETE' as const,
          path,
          ...handlerOrOptions,
        } as Parameters<typeof _internal.addRoute>[0]);
      }
    },

    patch<
      Path extends string,
      RequestSchema extends KoriRequestSchemaDefault | undefined = undefined,
      ResponseSchema extends KoriResponseSchemaDefault | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions:
        | KoriHandler<Env, Req, Res, Path, RequestValidator, undefined>
        | ({
            requestSchema?: RequestSchema;
            responseSchema?: ResponseSchema;
            handler: KoriHandler<Env, Req, Res, Path, RequestValidator, RequestSchema>;
            routeRequestValidationErrorHandler?: KoriRouteRequestValidationErrorHandler<
              Env,
              Req,
              Res,
              Path,
              RequestValidator,
              RequestSchema
            >;
            routeResponseValidationErrorHandler?: KoriRouteResponseValidationErrorHandler<
              Env,
              Req,
              Res,
              Path,
              ResponseValidator,
              ResponseSchema
            >;
            pluginMetadata?: KoriRoutePluginMetadata;
          } & RequestProviderCompatibility<RequestValidator, RequestSchema> &
            ResponseProviderCompatibility<ResponseValidator, ResponseSchema>),
    ): Kori<Env, Req, Res, RequestValidator, ResponseValidator> {
      if (typeof handlerOrOptions === 'function') {
        return _internal.addRoute({
          method: 'PATCH' as const,
          path,
          handler: handlerOrOptions,
        } as Parameters<typeof _internal.addRoute>[0]);
      } else {
        return _internal.addRoute({
          method: 'PATCH' as const,
          path,
          ...handlerOrOptions,
        } as Parameters<typeof _internal.addRoute>[0]);
      }
    },

    head<
      Path extends string,
      RequestSchema extends KoriRequestSchemaDefault | undefined = undefined,
      ResponseSchema extends KoriResponseSchemaDefault | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions:
        | KoriHandler<Env, Req, Res, Path, RequestValidator, undefined>
        | ({
            requestSchema?: RequestSchema;
            responseSchema?: ResponseSchema;
            handler: KoriHandler<Env, Req, Res, Path, RequestValidator, RequestSchema>;
            routeRequestValidationErrorHandler?: KoriRouteRequestValidationErrorHandler<
              Env,
              Req,
              Res,
              Path,
              RequestValidator,
              RequestSchema
            >;
            routeResponseValidationErrorHandler?: KoriRouteResponseValidationErrorHandler<
              Env,
              Req,
              Res,
              Path,
              ResponseValidator,
              ResponseSchema
            >;
            pluginMetadata?: KoriRoutePluginMetadata;
          } & RequestProviderCompatibility<RequestValidator, RequestSchema> &
            ResponseProviderCompatibility<ResponseValidator, ResponseSchema>),
    ): Kori<Env, Req, Res, RequestValidator, ResponseValidator> {
      if (typeof handlerOrOptions === 'function') {
        return _internal.addRoute({
          method: 'HEAD' as const,
          path,
          handler: handlerOrOptions,
        } as Parameters<typeof _internal.addRoute>[0]);
      } else {
        return _internal.addRoute({
          method: 'HEAD' as const,
          path,
          ...handlerOrOptions,
        } as Parameters<typeof _internal.addRoute>[0]);
      }
    },

    options<
      Path extends string,
      RequestSchema extends KoriRequestSchemaDefault | undefined = undefined,
      ResponseSchema extends KoriResponseSchemaDefault | undefined = undefined,
    >(
      path: Path,
      handlerOrOptions:
        | KoriHandler<Env, Req, Res, Path, RequestValidator, undefined>
        | ({
            requestSchema?: RequestSchema;
            responseSchema?: ResponseSchema;
            handler: KoriHandler<Env, Req, Res, Path, RequestValidator, RequestSchema>;
            routeRequestValidationErrorHandler?: KoriRouteRequestValidationErrorHandler<
              Env,
              Req,
              Res,
              Path,
              RequestValidator,
              RequestSchema
            >;
            routeResponseValidationErrorHandler?: KoriRouteResponseValidationErrorHandler<
              Env,
              Req,
              Res,
              Path,
              ResponseValidator,
              ResponseSchema
            >;
            pluginMetadata?: KoriRoutePluginMetadata;
          } & RequestProviderCompatibility<RequestValidator, RequestSchema> &
            ResponseProviderCompatibility<ResponseValidator, ResponseSchema>),
    ): Kori<Env, Req, Res, RequestValidator, ResponseValidator> {
      if (typeof handlerOrOptions === 'function') {
        return _internal.addRoute({
          method: 'OPTIONS' as const,
          path,
          handler: handlerOrOptions,
        } as Parameters<typeof _internal.addRoute>[0]);
      } else {
        return _internal.addRoute({
          method: 'OPTIONS' as const,
          path,
          ...handlerOrOptions,
        } as Parameters<typeof _internal.addRoute>[0]);
      }
    },

    generate(): KoriFetchHandler {
      const compiledRouter = _shared.router.compile();
      const allInitHooks = _shared.root._collectInitHooks();
      const allCloseHooks = _shared.root._collectCloseHooks();
      const rootLogger = _shared.rootLogger;
      return createFetchHandler({
        compiledRouter,
        allInitHooks,
        allCloseHooks,
        rootLogger,
      });
    },

    routeDefinitions() {
      return _shared.root._collectRouteDefinitions();
    },
  };

  return _internal;
}
