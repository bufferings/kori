import {
  executeHandlerDeferredCallbacks,
  isKoriResponse,
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriRequest,
  type KoriResponse,
} from '../../context/index.js';
import { type KoriOnRequestHook, type KoriOnErrorHook } from '../../hook/index.js';
import { createKoriSystemLogger } from '../../logging/index.js';
import { type KoriRequestSchemaDefault } from '../../request-schema/index.js';
import { type KoriRequestValidatorDefault } from '../../request-validator/index.js';
import { type KoriResponseSchemaDefault } from '../../response-schema/index.js';
import { type KoriResponseValidatorDefault } from '../../response-validator/index.js';
import {
  type WithPathParams,
  type KoriHandler,
  type KoriInstanceRequestValidationErrorHandler,
  type KoriInstanceResponseValidationErrorHandler,
  type KoriRouteRequestValidationErrorHandler,
  type KoriRouteResponseValidationErrorHandler,
  type InferRequestValidationError,
  type ValidatedRequest,
  type InferResponseValidationError,
} from '../../routing/index.js';
import { resolveInternalRequestValidator } from '../request-validation-resolver/index.js';
import { resolveInternalResponseValidator } from '../response-validation-resolver/index.js';

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
  return async (
    ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
    mainHandler: (ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>) => Promise<KoriResponse>,
  ): Promise<KoriResponse> => {
    let currentCtx = ctx;
    let isAborted = false;

    try {
      for (const hook of hooks.requestHooks) {
        const result = await hook(currentCtx);
        if (isKoriResponse(result)) {
          isAborted = true;
          break;
        }
        if (result) {
          currentCtx = result;
        }
      }

      if (!isAborted) {
        await mainHandler(currentCtx);
      }
    } catch (err) {
      let isErrHandled = false;
      for (const hook of hooks.errorHooks) {
        try {
          const result = await hook(currentCtx, err);
          if (isKoriResponse(result)) {
            isErrHandled = true;
            break;
          }
        } catch (hookError) {
          const sys = createKoriSystemLogger({ baseLogger: currentCtx.log() });
          sys.error('Error hook execution failed', {
            type: 'error-hook',
            err: sys.serializeError(hookError),
          });
        }
      }

      if (!isErrHandled) {
        const sys = createKoriSystemLogger({ baseLogger: currentCtx.log() });
        sys.error('Unhandled error in route handler', {
          err: sys.serializeError(err),
        });
        currentCtx.res.internalError();
      }
    } finally {
      await executeHandlerDeferredCallbacks(currentCtx);
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
  error: InferRequestValidationError<RequestValidator>,
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
    const sys = createKoriSystemLogger({ baseLogger: ctx.log() });
    sys.warn('Request validation failed', {
      type: 'request-validation',
      err: sys.serializeError(err),
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
    const sys = createKoriSystemLogger({ baseLogger: ctx.log() });
    sys.warn('Response validation failed', {
      type: 'response-validation',
      err: sys.serializeError(err),
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
): (ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>) => Promise<KoriResponse> {
  type ValidatedContext = KoriHandlerContext<
    Env,
    ValidatedRequest<WithPathParams<Req, Path>, RequestValidator, RequestSchema>,
    Res
  >;

  const executeWithHooks = createHookExecutor<Env, Req, Res, Path>({
    requestHooks: deps.requestHooks,
    errorHooks: deps.errorHooks,
  });

  const requestValidateFn = resolveInternalRequestValidator({
    requestValidator: deps.requestValidator,
    requestSchema: routeParams.requestSchema,
  });

  const responseValidateFn = resolveInternalResponseValidator({
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
          validationResult.error as InferRequestValidationError<RequestValidator>,
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
    return routeParams.handler as unknown as (
      ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
    ) => Promise<KoriResponse>;
  }

  return (ctx) => executeWithHooks(ctx, mainHandler);
}
