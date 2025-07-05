import { isKoriResponse } from '../context/index.js';
import {
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriRequest,
  type KoriResponse,
} from '../context/index.js';
import {
  type KoriOnRequestHook,
  type KoriOnResponseHook,
  type KoriOnErrorHook,
  type KoriOnFinallyHook,
} from '../hook/index.js';
import {
  resolveRequestValidationFunction,
  type InferRequestValidatorError,
  type KoriRequestValidatorDefault,
  type WithValidatedRequest,
  type PreValidationError,
} from '../request-validation/index.js';
import {
  resolveResponseValidationFunction,
  type KoriResponseValidatorDefault,
  type InferResponseValidationError,
} from '../response-validation/index.js';
import { type KoriRouterHandler, type WithPathParams } from '../router/index.js';
import { type KoriRequestSchemaDefault, type KoriResponseSchemaDefault } from '../schema/index.js';

import {
  type KoriHandler,
  type KoriInstancePreRequestValidationErrorHandler,
  type KoriRoutePreRequestValidationErrorHandler,
  type KoriInstanceRequestValidationErrorHandler,
  type KoriInstanceResponseValidationErrorHandler,
  type KoriRouteRequestValidationErrorHandler,
  type KoriRouteResponseValidationErrorHandler,
} from './route.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type KoriOnRequestHookAny = KoriOnRequestHook<any, any, any, any, any>;
type KoriOnResponseHookAny = KoriOnResponseHook<any, any, any>;
type KoriOnErrorHookAny = KoriOnErrorHook<any, any, any>;
type KoriOnFinallyHookAny = KoriOnFinallyHook<any, any, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

type Dependencies<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
> = {
  requestValidator?: RequestValidator;
  responseValidator?: ResponseValidator;
  onPreRequestValidationError?: KoriInstancePreRequestValidationErrorHandler<Env, Req, Res>;
  onRequestValidationError?: KoriInstanceRequestValidationErrorHandler<Env, Req, Res, RequestValidator>;
  onResponseValidationError?: KoriInstanceResponseValidationErrorHandler<Env, Req, Res, ResponseValidator>;
  requestHooks: KoriOnRequestHookAny[];
  responseHooks: KoriOnResponseHookAny[];
  errorHooks: KoriOnErrorHookAny[];
  finallyHooks: KoriOnFinallyHookAny[];
};

type RouteParameters<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
  RequestSchema extends KoriRequestSchemaDefault | undefined,
  ResponseSchema extends KoriResponseSchemaDefault | undefined,
> = {
  requestSchema?: RequestSchema;
  responseSchema?: ResponseSchema;
  handler: KoriHandler<Env, Req, Res, Path, RequestValidator, RequestSchema>;
  routePreRequestValidationErrorHandler?: KoriRoutePreRequestValidationErrorHandler<Env, Req, Res, Path>;
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
};

function createHookExecutor<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
>(hooks: {
  requestHooks: KoriOnRequestHookAny[];
  responseHooks: KoriOnResponseHookAny[];
  errorHooks: KoriOnErrorHookAny[];
  finallyHooks: KoriOnFinallyHookAny[];
}) {
  const reversedResponseHooks = [...hooks.responseHooks].reverse();
  const reversedFinallyHooks = [...hooks.finallyHooks].reverse();

  const executeRequestHooks = async (
    ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
  ): Promise<{ ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>; halt: boolean }> => {
    let currentCtx = ctx;

    for (const hook of hooks.requestHooks) {
      const result = await hook(currentCtx);
      if (isKoriResponse(result)) {
        return { ctx: currentCtx, halt: true };
      }
      currentCtx = result ?? currentCtx;
    }

    return { ctx: currentCtx, halt: false };
  };

  const executeResponseHooks = async (ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>): Promise<void> => {
    for (const hook of reversedResponseHooks) {
      await hook(ctx);
    }
  };

  const executeErrorHooks = async (
    ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
    err: unknown,
  ): Promise<void> => {
    for (const hook of hooks.errorHooks) {
      await hook(ctx, err);
    }
  };

  const executeFinallyHooks = async (ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>): Promise<void> => {
    for (const hook of reversedFinallyHooks) {
      try {
        await hook(ctx);
      } catch (e) {
        ctx.req.log.error('Finally Hook Error', { err: e });
      }
    }
  };

  return async (
    ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
    mainHandler: (ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>) => Promise<KoriResponse>,
  ): Promise<KoriResponse> => {
    let currentCtx = ctx;

    try {
      const shouldHalt = await executeRequestHooks(currentCtx);
      if (shouldHalt.halt) {
        currentCtx = shouldHalt.ctx;
      } else {
        currentCtx = shouldHalt.ctx;
        await mainHandler(currentCtx);
      }

      await executeResponseHooks(currentCtx);
    } catch (err) {
      await executeErrorHooks(currentCtx, err);
    } finally {
      await executeFinallyHooks(currentCtx);
    }

    return currentCtx.res;
  };
}

function createPreRequestValidationErrorHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
>({
  instanceHandler,
  routeHandler,
}: {
  instanceHandler?: KoriInstancePreRequestValidationErrorHandler<Env, Req, Res>;
  routeHandler?: KoriRoutePreRequestValidationErrorHandler<Env, Req, Res, Path>;
}): (
  ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
  error: PreValidationError,
) => Promise<KoriResponse | void> {
  if (routeHandler) {
    return (ctx, err) => Promise.resolve(routeHandler(ctx, err));
  }

  if (instanceHandler) {
    return (ctx, err) => Promise.resolve(instanceHandler(ctx, err));
  }

  // Default handling (automatically returns appropriate response)
  return (ctx, err) => {
    ctx.req.log.warn('Pre-validation error occurred but is not being handled.', { err });

    switch (err.type) {
      case 'UNSUPPORTED_MEDIA_TYPE':
        return Promise.resolve(
          ctx.res.unsupportedMediaType({
            message: err.message,
            details: {
              supportedTypes: err.supportedTypes,
              requestedType: err.requestedType,
            },
          }),
        );
      case 'INVALID_JSON':
        return Promise.resolve(
          ctx.res.badRequest({
            message: err.message,
            details: err.cause,
          }),
        );
      default:
        return Promise.resolve(undefined);
    }
  };
}

function createRequestValidationErrorHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  RequestSchema extends KoriRequestSchemaDefault | undefined,
>({
  instanceHandler,
  routeHandler,
}: {
  instanceHandler?: KoriInstanceRequestValidationErrorHandler<Env, Req, Res, RequestValidator>;
  routeHandler?: KoriRouteRequestValidationErrorHandler<Env, Req, Res, Path, RequestValidator, RequestSchema>;
}): (
  ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
  error: InferRequestValidatorError<RequestValidator>,
) => Promise<KoriResponse | void> {
  if (routeHandler) {
    return (ctx, err) => Promise.resolve(routeHandler(ctx, err));
  }

  if (instanceHandler) {
    return (ctx, err) => Promise.resolve(instanceHandler(ctx, err));
  }

  return (ctx, err) => {
    ctx.req.log.warn('Validation error occurred but is not being handled.', { err });
    return Promise.resolve(undefined);
  };
}

function createResponseValidationErrorHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
  ResponseSchema extends KoriResponseSchemaDefault | undefined,
>({
  instanceHandler,
  routeHandler,
}: {
  instanceHandler?: KoriInstanceResponseValidationErrorHandler<Env, Req, Res, ResponseValidator>;
  routeHandler?: KoriRouteResponseValidationErrorHandler<Env, Req, Res, Path, ResponseValidator, ResponseSchema>;
}): (
  ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
  error: InferResponseValidationError<ResponseValidator>,
) => Promise<KoriResponse | void> {
  if (routeHandler) {
    return (ctx, err) => Promise.resolve(routeHandler(ctx, err));
  }

  if (instanceHandler) {
    return (ctx, err) => Promise.resolve(instanceHandler(ctx, err));
  }

  return (ctx, err) => {
    ctx.req.log.warn('Response validation error occurred but is not being handled.', { err });
    return Promise.resolve(undefined);
  };
}

export function createRouteHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
  RequestSchema extends KoriRequestSchemaDefault | undefined,
  ResponseSchema extends KoriResponseSchemaDefault | undefined,
>(
  deps: Dependencies<Env, Req, Res, RequestValidator, ResponseValidator>,
  routeParams: RouteParameters<Env, Req, Res, Path, RequestValidator, ResponseValidator, RequestSchema, ResponseSchema>,
): KoriRouterHandler<Env, WithPathParams<Req, Path>, Res> {
  type ValidatedContext = KoriHandlerContext<
    Env,
    WithValidatedRequest<WithPathParams<Req, Path>, RequestValidator, RequestSchema>,
    Res
  >;

  const executeWithHooks = createHookExecutor<Env, Req, Res, Path>({
    requestHooks: deps.requestHooks,
    responseHooks: deps.responseHooks,
    errorHooks: deps.errorHooks,
    finallyHooks: deps.finallyHooks,
  });

  const requestValidateFn = resolveRequestValidationFunction({
    requestValidator: deps.requestValidator,
    requestSchema: routeParams.requestSchema,
  });

  const responseValidateFn = resolveResponseValidationFunction({
    responseValidator: deps.responseValidator,
    responseSchema: routeParams.responseSchema,
  });

  const preRequestValidationErrorHandler = createPreRequestValidationErrorHandler({
    instanceHandler: deps.onPreRequestValidationError,
    routeHandler: routeParams.routePreRequestValidationErrorHandler,
  });

  const requestValidationErrorHandler = createRequestValidationErrorHandler({
    instanceHandler: deps.onRequestValidationError,
    routeHandler: routeParams.routeRequestValidationErrorHandler,
  });

  const responseValidationErrorHandler = createResponseValidationErrorHandler({
    instanceHandler: deps.onResponseValidationError,
    routeHandler: routeParams.routeResponseValidationErrorHandler,
  });

  const mainHandler = async (ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>): Promise<KoriResponse> => {
    if (requestValidateFn) {
      const validationResult = await requestValidateFn(ctx.req);
      if (!validationResult.ok) {
        const error = validationResult.error;

        // 1. Handle pre-validation errors
        if (error.stage === 'pre-validation') {
          const handlerResult = await preRequestValidationErrorHandler(ctx, error.error);
          if (handlerResult) {
            return handlerResult;
          }
          // Default handler always processes this, so this line should never be reached
        }

        // 2. Handle validation errors
        if (error.stage === 'validation') {
          const handlerResult = await requestValidationErrorHandler(
            ctx,
            error.error as InferRequestValidatorError<RequestValidator>,
          );
          if (handlerResult) {
            return handlerResult;
          }
          return ctx.res.badRequest({ message: 'Validation Failed' });
        }
      } else {
        // Set validated data only when validation succeeds
        ctx = ctx.withReq({ validated: validationResult.value });
      }
    }

    const response = await routeParams.handler(ctx as ValidatedContext);

    if (responseValidateFn) {
      const responseValidationResult = await responseValidateFn(response);
      if (!responseValidationResult.ok) {
        const handlerResult = await responseValidationErrorHandler(
          ctx,
          responseValidationResult.error as InferResponseValidationError<ResponseValidator>,
        );
        if (handlerResult) {
          // TODO: Consider
          return handlerResult;
        }
      }
    }

    return response;
  };

  return (ctx) => executeWithHooks(ctx, mainHandler);
}
