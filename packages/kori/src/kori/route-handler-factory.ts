import {
  executeHandlerDeferredCallbacks,
  isKoriResponseAbort,
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriRequest,
  type KoriResponse,
} from '../context/index.js';
import { type KoriOnRequestHook, type KoriOnErrorHook } from '../hook/index.js';
import { SYS_CHANNEL } from '../logging/index.js';
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
type KoriOnErrorHookAny = KoriOnErrorHook<any, any, any>;
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
  errorHooks: KoriOnErrorHookAny[];
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
>(hooks: { requestHooks: KoriOnRequestHookAny[]; errorHooks: KoriOnErrorHookAny[] }) {
  const executeRequestHooks = async (
    ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
  ): Promise<KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>> => {
    let currentCtx = ctx;
    for (const hook of hooks.requestHooks) {
      const result = await hook(currentCtx);

      // Check abort status after each hook execution.
      // Even if result is undefined, the hook might have called res.abort().
      // isKoriResponseAbort check is for TypeScript type safety.
      if (currentCtx.res.isAborted() || isKoriResponseAbort(result)) {
        return currentCtx;
      }

      if (result) {
        currentCtx = result;
      }
    }

    return currentCtx;
  };

  const executeErrorHooks = async (
    ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
    err: unknown,
  ): Promise<void> => {
    for (const hook of hooks.errorHooks) {
      if (ctx.res.isAborted()) {
        return;
      }
      try {
        await hook(ctx, err);
      } catch (hookError) {
        ctx.log().channel(SYS_CHANNEL).child('error-hook').error('Error hook execution failed', {
          originalError: err,
          hookError,
        });
      }
    }
  };

  const executeDeferredCleanup = async (
    ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
  ): Promise<void> => {
    await executeHandlerDeferredCallbacks(ctx);
  };

  return async (
    ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
    mainHandler: (ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>) => Promise<KoriResponse>,
  ): Promise<KoriResponse> => {
    let currentCtx = ctx;

    try {
      currentCtx = await executeRequestHooks(currentCtx);
      if (!currentCtx.res.isAborted()) {
        await mainHandler(currentCtx);
      }
    } catch (err) {
      await executeErrorHooks(currentCtx, err);
    } finally {
      await executeDeferredCleanup(currentCtx);
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
      const instanceResult = await instanceHandler(ctx as unknown as KoriHandlerContext<Env, Req, Res>, err);
      if (instanceResult) {
        return instanceResult;
      }
    }

    // 3. Handle pre-validation unsupported media type errors with 415 status
    if (err.body?.stage === 'pre-validation' && err.body.type === 'UNSUPPORTED_MEDIA_TYPE') {
      return ctx.res.unsupportedMediaType();
    }

    // 4. Default validation error handling with 400 status
    // Log error occurrence for monitoring
    ctx.log().channel(SYS_CHANNEL).child('request-validation').warn('Request validation failed', {
      path: ctx.req.url().pathname,
      method: ctx.req.method(),
      validationError: err,
    });

    // Return minimal error information to client
    return ctx.res.badRequest({
      message: 'Request validation failed',
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
      const instanceResult = await instanceHandler(ctx as unknown as KoriHandlerContext<Env, Req, Res>, err);
      if (instanceResult) {
        return instanceResult;
      }
    }

    // 3. Default handling (log warning but return void to use original response)
    ctx.log().channel(SYS_CHANNEL).child('response-validation').warn('Response validation failed', {
      path: ctx.req.url().pathname,
      method: ctx.req.method(),
      validationError: err,
    });
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
    errorHooks: deps.errorHooks,
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
      ctx = ctx.withReq({
        validatedBody: () => validationResult.value.body,
        validatedParams: () => validationResult.value.params,
        validatedQueries: () => validationResult.value.queries,
        validatedHeaders: () => validationResult.value.headers,
      });
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
  const hasHooks = deps.requestHooks.length > 0 || deps.errorHooks.length > 0;

  const hasValidation = !!requestValidateFn || !!responseValidateFn;

  if (!hasHooks && !hasValidation) {
    // The route is a straight passthrough. Return the original handler
    // to avoid unnecessary wrapper overhead.
    return routeParams.handler as unknown as KoriRouterHandler<Env, WithPathParams<Req, Path>, Res>;
  }

  return (ctx) => executeWithHooks(ctx, mainHandler);
}
