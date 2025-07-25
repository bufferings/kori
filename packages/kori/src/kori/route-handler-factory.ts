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
import { HttpStatus } from '../http/index.js';
import {
  resolveRequestValidationFunction,
  type InferRequestValidatorError,
  type KoriRequestValidatorDefault,
  type WithValidatedRequest,
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
        ctx.req.log().error('Finally Hook Error', { err: e });
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
) => Promise<KoriResponse> {
  return async (ctx, err) => {
    // 1. Try route handler first
    if (routeHandler) {
      const routeResult = await routeHandler(ctx, err);
      if (routeResult) {
        return routeResult;
      }
    }

    // 2. Try instance handler
    if (instanceHandler) {
      const instanceResult = await instanceHandler(ctx, err);
      if (instanceResult) {
        return instanceResult;
      }
    }

    // 3. Handle pre-validation unsupported media type errors with 415 status
    if (err.body?.stage === 'pre-validation' && err.body.type === 'UNSUPPORTED_MEDIA_TYPE') {
      return ctx.res.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).json({
        error: 'Unsupported Media Type',
        message: err.body.message,
        supportedTypes: err.body.supportedTypes,
        requestedType: err.body.requestedType,
      });
    }

    // 4. Default validation error handling with 400 status
    return ctx.res.badRequest({
      message: 'Request validation failed',
      details: err,
    });
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
  return async (ctx, err) => {
    // 1. Try route handler first
    if (routeHandler) {
      const routeResult = await routeHandler(ctx, err);
      if (routeResult) {
        return routeResult;
      }
    }

    // 2. Try instance handler
    if (instanceHandler) {
      const instanceResult = await instanceHandler(ctx, err);
      if (instanceResult) {
        return instanceResult;
      }
    }

    // 3. Default handling (log warning but return void to use original response)
    ctx.req.log().warn('Response validation failed', { err });
    return undefined;
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

  const requestValidationErrorHandler = createRequestValidationErrorHandler({
    instanceHandler: deps.onRequestValidationError,
    routeHandler: routeParams.onRequestValidationError,
  });

  const responseValidationErrorHandler = createResponseValidationErrorHandler({
    instanceHandler: deps.onResponseValidationError,
    routeHandler: routeParams.onResponseValidationError,
  });

  const mainHandler = async (ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>): Promise<KoriResponse> => {
    if (requestValidateFn) {
      const validationResult = await requestValidateFn(ctx.req);
      if (!validationResult.ok) {
        return await requestValidationErrorHandler(
          ctx,
          validationResult.error as InferRequestValidatorError<RequestValidator>,
        );
      }

      // Set validated data only when validation succeeds
      ctx = ctx.withReq({ validated: validationResult.value });
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
          return handlerResult;
        }
        // If handler returns void, fall through to return original response
      }
    }

    return response;
  };

  /* ------------------------------------------------------- */
  /* Fast-path: no hooks & no validation                     */
  /* ------------------------------------------------------- */
  const hasHooks =
    deps.requestHooks.length > 0 ||
    deps.responseHooks.length > 0 ||
    deps.errorHooks.length > 0 ||
    deps.finallyHooks.length > 0;

  const hasValidation = !!requestValidateFn || !!responseValidateFn;

  if (!hasHooks && !hasValidation) {
    // The route is a straight passthrough. Return the original handler
    // to avoid unnecessary wrapper overhead.
    return routeParams.handler as unknown as KoriRouterHandler<Env, WithPathParams<Req, Path>, Res>;
  }

  return (ctx) => executeWithHooks(ctx, mainHandler);
}
