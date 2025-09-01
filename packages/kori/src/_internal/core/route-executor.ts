import {
  isKoriResponse,
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriRequest,
  type KoriResponse,
  createKoriHandlerContext,
  createKoriRequest,
  createKoriResponse,
} from '../../context/index.js';
import { type KoriOnErrorHook, type KoriOnRequestHook } from '../../hook/index.js';
import { HttpStatus } from '../../http/index.js';
import { createKoriSystemLogger } from '../../logging/index.js';
import { type KoriLoggerFactory } from '../../logging/index.js';
import { type KoriRequestValidatorDefault } from '../../request-validator/index.js';
import { type KoriResponseValidatorDefault } from '../../response-validator/index.js';
import { type KoriRouteId } from '../../route-matcher/index.js';
import { type WithPathParams } from '../../routing/index.js';
import { type MaybePromise } from '../../util/index.js';
import { resolveInternalRequestValidator } from '../request-validation-resolver/index.js';
import { resolveInternalResponseValidator } from '../response-validation-resolver/index.js';

import { type RouteRecord } from './route-registry.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type KoriOnRequestHookAny = KoriOnRequestHook<any, any, any, any, any>;
type KoriOnErrorHookAny = KoriOnErrorHook<any, any, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

type InstanceDeps<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse> = {
  env: Env;
  loggerFactory: KoriLoggerFactory;
  requestValidator?: KoriRequestValidatorDefault;
  responseValidator?: KoriResponseValidatorDefault;
  onRequestValidationError?: (ctx: KoriHandlerContext<Env, Req, Res>, err: unknown) => unknown;
  onResponseValidationError?: (ctx: KoriHandlerContext<Env, Req, Res>, err: unknown) => unknown;
  requestHooks: KoriOnRequestHookAny[];
  errorHooks: KoriOnErrorHookAny[];
};

export function createRouteExecutor<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>({
  getRouteRecord,
  deps,
}: {
  getRouteRecord: (id: KoriRouteId) => RouteRecord | undefined;
  deps: InstanceDeps<Env, Req, Res>;
}): {
  execute: (
    request: Request & { readonly params?: Record<string, string>; readonly pathTemplate?: string },
  ) => Promise<Response>;
  executeRoute: <Path extends string>(
    routeId: KoriRouteId,
    request: Request,
    pathParams: Record<string, string>,
    pathTemplate: Path,
  ) => Promise<Response>;
} {
  async function execute(
    request: Request & { readonly params?: Record<string, string>; readonly pathTemplate?: string },
  ): Promise<Response> {
    const pathParams = request.params ?? {};
    const pathTemplate = request.pathTemplate ?? '';

    const req = createKoriRequest({
      rawRequest: request,
      pathParams,
      pathTemplate,
    }) as unknown as WithPathParams<Req, string>;

    let ctx = createKoriHandlerContext<Env, WithPathParams<Req, string>, Res>({
      env: deps.env,
      req,
      res: createKoriResponse(req) as unknown as Res,
      loggerFactory: deps.loggerFactory,
    });

    const sys = createKoriSystemLogger({ baseLogger: ctx.log() });

    try {
      for (const hook of deps.requestHooks) {
        const result = await hook(ctx);
        if (isKoriResponse(result)) {
          return (result as unknown as KoriResponse).build();
        }
        if (result) {
          ctx = result as typeof ctx;
        }
      }
    } catch (err) {
      for (const hook of deps.errorHooks) {
        try {
          const result = await hook(ctx, err);
          if (isKoriResponse(result)) {
            return (result as unknown as KoriResponse).build();
          }
        } catch (hookError) {
          const sys2 = createKoriSystemLogger({ baseLogger: ctx.log() });
          sys2.error('Error hook execution failed', { type: 'error-hook', err: sys2.serializeError(hookError) });
        }
      }
      sys.error('Unhandled error in request hooks', { err: sys.serializeError(err) });
      return ctx.res.internalError().build();
    }

    return ctx.res.build();
  }

  async function executeRoute<Path extends string>(
    routeId: KoriRouteId,
    request: Request,
    pathParams: Record<string, string>,
    pathTemplate: Path,
  ): Promise<Response> {
    const record = getRouteRecord(routeId);
    if (!record) {
      return new Response('Not Found', { status: HttpStatus.NOT_FOUND });
    }

    const req = createKoriRequest({ rawRequest: request, pathParams, pathTemplate });
    const res = createKoriResponse(req);

    let ctx = createKoriHandlerContext({ env: deps.env, req, res, loggerFactory: deps.loggerFactory });

    const requestValidateFn = resolveInternalRequestValidator({
      requestValidator: deps.requestValidator,
      requestSchema: record.requestSchema,
    });

    const responseValidateFn = resolveInternalResponseValidator({
      responseValidator: deps.responseValidator,
      responseSchema: record.responseSchema,
    });

    if (requestValidateFn) {
      const validationResult = await requestValidateFn(ctx.req);
      if (!validationResult.ok) {
        const onRequestValidationError = (record.onRequestValidationError ?? deps.onRequestValidationError) as
          | ((ctx: KoriHandlerContext<KoriEnvironment, KoriRequest, KoriResponse>, err: unknown) => unknown)
          | undefined;
        if (onRequestValidationError) {
          const handled = await onRequestValidationError(ctx, validationResult.error);
          if (handled && isKoriResponse(handled)) {
            return handled.build();
          }
        }
        const sys = createKoriSystemLogger({ baseLogger: ctx.log() });
        sys.warn('Request validation failed', {
          type: 'request-validation',
          err: sys.serializeError(validationResult.error),
        });
        return ctx.res.badRequest({ message: 'Request validation failed' }).build();
      }

      ctx = ctx.withReq({
        validatedBody: () => validationResult.value.body,
        validatedParams: () => validationResult.value.params,
        validatedQueries: () => validationResult.value.queries,
        validatedHeaders: () => validationResult.value.headers,
      });
    }

    const handler = record.handler as (
      ctx: KoriHandlerContext<KoriEnvironment, KoriRequest, KoriResponse>,
    ) => MaybePromise<KoriResponse>;
    const response = await handler(ctx);

    if (responseValidateFn) {
      const responseValidationResult = await responseValidateFn(response);
      if (!responseValidationResult.ok) {
        const onResponseValidationError = (record.onResponseValidationError ?? deps.onResponseValidationError) as
          | ((ctx: KoriHandlerContext<KoriEnvironment, KoriRequest, KoriResponse>, err: unknown) => unknown)
          | undefined;
        if (onResponseValidationError) {
          const handled = await onResponseValidationError(ctx, responseValidationResult.error);
          if (handled && isKoriResponse(handled)) {
            return handled.build();
          }
        }
      }
    }

    return response.build();
  }

  return { execute, executeRoute } as const;
}
