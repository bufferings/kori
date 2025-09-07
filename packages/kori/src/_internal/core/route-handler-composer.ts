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
  type KoriInstanceRequestValidationFailureHandler,
  type KoriInstanceResponseValidationFailureHandler,
  type KoriRouteRequestValidationFailureHandler,
  type KoriRouteResponseValidationFailureHandler,
  type ValidatedRequest,
  type InferRequestValidationFailureReason,
  type InferResponseValidationFailureReason,
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
  ReqV extends KoriRequestValidatorDefault | undefined,
  ResV extends KoriResponseValidatorDefault | undefined,
> = {
  requestValidator?: ReqV;
  responseValidator?: ResV;
  instanceOnRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<Env, Req, Res, ReqV>;
  instanceOnResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<Env, Req, Res, ResV>;
  requestHooks: KoriOnRequestHookAny[];
  errorHooks: KoriOnErrorHookAny[];
};

type RouteParameters<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  ReqV extends KoriRequestValidatorDefault | undefined,
  ResV extends KoriResponseValidatorDefault | undefined,
  ReqS extends KoriRequestSchemaDefault | undefined,
  ResS extends KoriResponseSchemaDefault | undefined,
> = {
  requestSchema?: ReqS;
  responseSchema?: ResS;
  handler: KoriHandler<Env, Req, Res, Path, ReqV, ReqS>;
  routeOnRequestValidationFailure?: KoriRouteRequestValidationFailureHandler<Env, Req, Res, Path, ReqV, ReqS>;
  routeOnResponseValidationFailure?: KoriRouteResponseValidationFailureHandler<Env, Req, Res, Path, ResV, ResS>;
};

/**
 * Creates hook executor for request and error hooks with proper error handling.
 *
 * Executes request hooks sequentially and handles early termination when a hook
 * returns a response. For errors, attempts all error hooks and provides fallback
 * handling when no hook processes the error.
 */
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

/**
 * Creates request validation failure handler with cascading fallback logic.
 *
 * Tries route-level handler first, then instance-level handler, and finally
 * provides default failure handling for unsupported media types and general
 * validation failures.
 */
function createRequestValidationFailureHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  ReqV extends KoriRequestValidatorDefault | undefined,
  ReqS extends KoriRequestSchemaDefault | undefined,
>({
  instanceHandler,
  routeHandler,
}: {
  instanceHandler?: KoriInstanceRequestValidationFailureHandler<Env, Req, Res, ReqV>;
  routeHandler?: KoriRouteRequestValidationFailureHandler<Env, Req, Res, Path, ReqV, ReqS>;
}): (
  ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
  reason: InferRequestValidationFailureReason<ReqV>,
) => Promise<KoriResponse> {
  return async (ctx, reason) => {
    // 1. Try route handler first
    if (routeHandler) {
      const routeResult = await routeHandler(ctx, reason);
      if (routeResult) {
        return routeResult;
      }
    }

    // 2. Try instance handler
    if (instanceHandler) {
      const instanceResult = await instanceHandler(ctx as unknown as KoriHandlerContext<Env, Req, Res>, reason);
      if (instanceResult) {
        return instanceResult;
      }
    }

    // 3. Handle pre-validation unsupported media type failure with 415 status
    if (reason.body?.stage === 'pre-validation' && reason.body.type === 'UNSUPPORTED_MEDIA_TYPE') {
      return ctx.res.unsupportedMediaType();
    }

    // 4. Default validation error handling with 400 status
    // Log error occurrence for monitoring
    const sys = createKoriSystemLogger({ baseLogger: ctx.log() });
    sys.warn('Request validation failed', {
      type: 'request-validation',
      err: sys.serializeError(reason),
    });

    // Return minimal error information to client
    return ctx.res.badRequest({
      message: 'Request validation failed',
    });
  };
}

/**
 * Creates response validation failure handler with cascading fallback logic.
 *
 * Tries route-level handler first, then instance-level handler. If no custom
 * handler is provided or handles the failure, logs a warning and allows the
 * original response to be returned.
 */
function createResponseValidationFailureHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  ResV extends KoriResponseValidatorDefault | undefined,
  ResS extends KoriResponseSchemaDefault | undefined,
>({
  instanceHandler,
  routeHandler,
}: {
  instanceHandler?: KoriInstanceResponseValidationFailureHandler<Env, Req, Res, ResV>;
  routeHandler?: KoriRouteResponseValidationFailureHandler<Env, Req, Res, Path, ResV, ResS>;
}): (
  ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
  reason: InferResponseValidationFailureReason<ResV>,
) => Promise<KoriResponse | void> {
  return async (ctx, reason) => {
    // 1. Try route handler first
    if (routeHandler) {
      const routeResult = await routeHandler(ctx, reason);
      if (routeResult) {
        return routeResult;
      }
    }

    // 2. Try instance handler
    if (instanceHandler) {
      const instanceResult = await instanceHandler(ctx as unknown as KoriHandlerContext<Env, Req, Res>, reason);
      if (instanceResult) {
        return instanceResult;
      }
    }

    // 3. Default handling (log warning but return void to use original response)
    const sys = createKoriSystemLogger({ baseLogger: ctx.log() });
    sys.warn('Response validation failed', {
      type: 'response-validation',
      err: sys.serializeError(reason),
    });
    return undefined;
  };
}

/**
 * Composes a route handler with hooks, request/response validation, and validation failure handlers.
 *
 * @template Env - Environment type containing instance-specific data
 * @template Req - Request type with request-specific data and methods
 * @template Res - Response type with response building capabilities
 * @template Path - URL path pattern with parameter placeholders
 * @template RequestValidator - Request validator for type-safe validation
 * @template ResponseValidator - Response validator for type-safe validation
 * @template RequestSchema - Request schema defining validation structure
 * @template ResponseSchema - Response schema defining validation structure
 *
 * @param deps - Dependencies for handler composition
 * @param routeParams - Route parameters for handler composition
 * @returns Composed handler function
 *
 * @internal
 */
export function composeRouteHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  ReqV extends KoriRequestValidatorDefault | undefined,
  ResV extends KoriResponseValidatorDefault | undefined,
  ReqS extends KoriRequestSchemaDefault | undefined,
  ResS extends KoriResponseSchemaDefault | undefined,
>({
  deps,
  routeParams,
}: {
  deps: Dependencies<Env, Req, Res, ReqV, ResV>;
  routeParams: RouteParameters<Env, Req, Res, Path, ReqV, ResV, ReqS, ResS>;
}): (ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>) => Promise<KoriResponse> {
  type ValidatedContext = KoriHandlerContext<Env, ValidatedRequest<WithPathParams<Req, Path>, ReqV, ReqS>, Res>;

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

  const requestValidationFailureHandler = createRequestValidationFailureHandler({
    instanceHandler: deps.instanceOnRequestValidationFailure,
    routeHandler: routeParams.routeOnRequestValidationFailure,
  });

  const responseValidationFailureHandler = createResponseValidationFailureHandler({
    instanceHandler: deps.instanceOnResponseValidationFailure,
    routeHandler: routeParams.routeOnResponseValidationFailure,
  });

  const mainHandler = async (ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>): Promise<KoriResponse> => {
    if (requestValidateFn) {
      const validationResult = await requestValidateFn(ctx.req);
      if (!validationResult.success) {
        return await requestValidationFailureHandler(
          ctx,
          validationResult.reason as InferRequestValidationFailureReason<ReqV>,
        );
      }

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
      if (!responseValidationResult.success) {
        const handlerResult = await responseValidationFailureHandler(
          ctx,
          responseValidationResult.reason as InferResponseValidationFailureReason<ResV>,
        );
        if (handlerResult) {
          return handlerResult;
        }
        // If handler returns void, fall through to return original response
      }
    }

    return response;
  };

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
