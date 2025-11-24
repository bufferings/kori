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
import { type KoriRequestSchemaBase } from '../../request-schema/index.js';
import { type KoriResponseSchemaBase } from '../../response-schema/index.js';
import {
  type WithPathParams,
  type KoriHandler,
  type ValidatedRequest,
  type KoriRouteRequestValidationFailureHandler,
  type KoriRouteResponseValidationFailureHandler,
  type KoriInstanceRequestValidationFailureHandler,
  type KoriInstanceResponseValidationFailureHandler,
  type RequestValidationFailureBase,
  type ResponseValidationFailureBase,
} from '../../routing/index.js';
import { type KoriValidatorBase } from '../../validator/index.js';
import { resolveRequestValidator } from '../request-validation-resolver/index.js';
import { resolveResponseValidator } from '../response-validation-resolver/index.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type KoriOnRequestHookAny = KoriOnRequestHook<any, any, any, any, any>;
type KoriOnErrorHookAny = KoriOnErrorHook<any, any, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Creates a higher-order function that executes a main handler within a
 * request/error hook execution context.
 *
 * The executor manages the following lifecycle:
 * 1. Executes all `onRequest` hooks in order.
 * 2. If a hook returns a `KoriResponse`, the chain is aborted.
 * 3. If hooks complete, executes the `mainHandler`.
 * 4. If any step throws an error, executes `onError` hooks.
 * 5. Ensures `defer` callbacks are executed in `finally` block.
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

    try {
      for (const hook of hooks.requestHooks) {
        const result = await hook(currentCtx);
        if (isKoriResponse(result)) {
          // A request hook signaled to abort. The response is in `currentCtx.res`.
          return currentCtx.res;
        }
        if (result) {
          currentCtx = result;
        }
      }

      // Execute the main handler, but its return value is only a signal.
      // The actual response to be returned is always `currentCtx.res`.
      await mainHandler(currentCtx);
      return currentCtx.res;
    } catch (err) {
      for (const hook of hooks.errorHooks) {
        try {
          const result = await hook(currentCtx, err);
          if (isKoriResponse(result)) {
            // An error hook signaled that it handled the error.
            // The response is in `currentCtx.res`.
            return currentCtx.res;
          }
        } catch (hookError) {
          const sys = createKoriSystemLogger({ baseLogger: currentCtx.log() });
          sys.error('Error hook execution failed', {
            type: 'error-hook',
            err: sys.serializeError(hookError),
          });
        }
      }

      const sys = createKoriSystemLogger({ baseLogger: currentCtx.log() });
      sys.error('Unhandled error in route handler', {
        err: sys.serializeError(err),
      });
      return currentCtx.res.internalError();
    } finally {
      await executeHandlerDeferredCallbacks(currentCtx);
    }
  };
}

function fallbackRequestValidationFailureHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>(ctx: KoriHandlerContext<Env, Req, Res>, reason: RequestValidationFailureBase): KoriResponse {
  const sys = createKoriSystemLogger({ baseLogger: ctx.log() });

  // Handle pre-validation unsupported media type failure with 415 status
  if (
    reason.body?.stage === 'pre-validation' &&
    (reason.body.type === 'MISSING_CONTENT_TYPE' || reason.body.type === 'UNSUPPORTED_MEDIA_TYPE')
  ) {
    sys.info('Request validation failed with unsupported media type', {
      type: 'request-validation',
      err: reason,
    });
    return ctx.res.unsupportedMediaType();
  }

  sys.info('Request validation failed', {
    type: 'request-validation',
    err: reason,
  });
  return ctx.res.badRequest({ message: 'Request validation failed' });
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
  ReqV extends KoriValidatorBase | undefined,
  ReqS extends KoriRequestSchemaBase | undefined,
>({
  instanceHandler,
  routeHandler,
}: {
  instanceHandler?: KoriInstanceRequestValidationFailureHandler<Env, Req, Res, ReqV>;
  routeHandler?: KoriRouteRequestValidationFailureHandler<Env, Req, Res, Path, ReqV, ReqS>;
}): (
  ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
  reason: RequestValidationFailureBase,
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

    // 3. Fallback to default handler
    return fallbackRequestValidationFailureHandler(ctx, reason);
  };
}

function fallbackResponseValidationFailureHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
>(ctx: KoriHandlerContext<Env, Req, Res>, reason: ResponseValidationFailureBase): void {
  const sys = createKoriSystemLogger({ baseLogger: ctx.log() });
  sys.info('Response validation failed', {
    type: 'response-validation',
    err: reason,
  });
  return undefined;
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
  ResV extends KoriValidatorBase | undefined,
  ResS extends KoriResponseSchemaBase | undefined,
>({
  instanceHandler,
  routeHandler,
}: {
  instanceHandler?: KoriInstanceResponseValidationFailureHandler<Env, Req, Res, ResV>;
  routeHandler?: KoriRouteResponseValidationFailureHandler<Env, Req, Res, Path, ResV, ResS>;
}): (
  ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
  reason: ResponseValidationFailureBase,
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

    // 3. Fallback to default handler
    return fallbackResponseValidationFailureHandler(ctx, reason);
  };
}

type InstanceOptions<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ReqV extends KoriValidatorBase | undefined,
  ResV extends KoriValidatorBase | undefined,
> = {
  requestValidator?: ReqV;
  responseValidator?: ResV;
  instanceOnRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<Env, Req, Res, ReqV>;
  instanceOnResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<Env, Req, Res, ResV>;
  requestHooks: KoriOnRequestHookAny[];
  errorHooks: KoriOnErrorHookAny[];
};

type RouteOptions<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  ReqV extends KoriValidatorBase | undefined,
  ResV extends KoriValidatorBase | undefined,
  ReqS extends KoriRequestSchemaBase | undefined,
  ResS extends KoriResponseSchemaBase | undefined,
> = {
  requestSchema?: ReqS;
  responseSchema?: ResS;
  handler: KoriHandler<Env, Req, Res, Path, ReqV, ReqS>;
  routeOnRequestValidationFailure?: KoriRouteRequestValidationFailureHandler<Env, Req, Res, Path, ReqV, ReqS>;
  routeOnResponseValidationFailure?: KoriRouteResponseValidationFailureHandler<Env, Req, Res, Path, ResV, ResS>;
};

/**
 * Composes a final route handler by integrating hooks, validation, and
 * error handling around a user-provided handler.
 *
 * This function builds a pipeline that executes in the following order:
 * 1. Request hooks
 * 2. Request validation
 * 3. User-provided handler
 * 4. Response validation
 * 5. Error hooks (if any step fails)
 *
 * For performance, if no hooks or validation are configured for a route,
 * the original handler is returned directly to avoid wrapper overhead.
 *
 * @param options.instanceOptions - Instance-level configurations
 * @param options.routeOptions - Route-specific configurations
 * @returns The composed route handler function
 *
 * @internal The core handler composition logic for the framework.
 */
export function composeRouteHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  ReqV extends KoriValidatorBase | undefined,
  ResV extends KoriValidatorBase | undefined,
  ReqS extends KoriRequestSchemaBase | undefined,
  ResS extends KoriResponseSchemaBase | undefined,
>({
  instanceOptions,
  routeOptions,
}: {
  instanceOptions: InstanceOptions<Env, Req, Res, ReqV, ResV>;
  routeOptions: RouteOptions<Env, Req, Res, Path, ReqV, ResV, ReqS, ResS>;
}): (ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>) => Promise<KoriResponse> {
  const requestValidateFn = resolveRequestValidator({
    validator: instanceOptions.requestValidator,
    schema: routeOptions.requestSchema,
  });
  const responseValidateFn = resolveResponseValidator({
    validator: instanceOptions.responseValidator,
    schema: routeOptions.responseSchema,
  });

  const hasHooks = instanceOptions.requestHooks.length > 0 || instanceOptions.errorHooks.length > 0;
  const hasValidation = !!requestValidateFn || !!responseValidateFn;
  if (!hasHooks && !hasValidation) {
    // Optimization: If no hooks or validation are needed, return the original
    // handler directly to avoid unnecessary async wrapper overhead on the hot path.
    return routeOptions.handler as unknown as (
      ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>,
    ) => Promise<KoriResponse>;
  }

  const executeWithHooks = createHookExecutor<Env, Req, Res, Path>({
    requestHooks: instanceOptions.requestHooks,
    errorHooks: instanceOptions.errorHooks,
  });

  const requestValidationFailureHandler = createRequestValidationFailureHandler({
    instanceHandler: instanceOptions.instanceOnRequestValidationFailure,
    routeHandler: routeOptions.routeOnRequestValidationFailure,
  });

  const responseValidationFailureHandler = createResponseValidationFailureHandler({
    instanceHandler: instanceOptions.instanceOnResponseValidationFailure,
    routeHandler: routeOptions.routeOnResponseValidationFailure,
  });

  const mainHandler = async (ctx: KoriHandlerContext<Env, WithPathParams<Req, Path>, Res>): Promise<KoriResponse> => {
    if (requestValidateFn) {
      const validationResult = await requestValidateFn(ctx.req);
      if (!validationResult.success) {
        return await requestValidationFailureHandler(ctx, validationResult.reason);
      }

      ctx = ctx.withReq({
        validatedBody: () => validationResult.value.body,
        validatedParams: () => validationResult.value.params,
        validatedQueries: () => validationResult.value.queries,
        validatedHeaders: () => validationResult.value.headers,
        validatedCookies: () => validationResult.value.cookies,
      });
    }

    type ValidatedContext = KoriHandlerContext<Env, ValidatedRequest<WithPathParams<Req, Path>, ReqV, ReqS>, Res>;
    const response = await routeOptions.handler(ctx as ValidatedContext);

    if (responseValidateFn) {
      const responseValidationResult = await responseValidateFn(response);
      if (!responseValidationResult.success) {
        const handlerResult = await responseValidationFailureHandler(ctx, responseValidationResult.reason);
        if (handlerResult) {
          return handlerResult;
        }
        // If handler returns void, fall through to return original response
      }
    }

    return response;
  };

  return (ctx) => executeWithHooks(ctx, mainHandler);
}
