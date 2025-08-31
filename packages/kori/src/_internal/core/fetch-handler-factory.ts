import {
  createKoriEnvironment,
  createKoriInstanceContext,
  executeInstanceDeferredCallbacks,
} from '../../context/index.js';
import { type KoriFetchHandler } from '../../fetch-handler/index.js';
import { type KoriOnStartHook } from '../../hook/index.js';
import { HttpStatus } from '../../http/index.js';
import { type KoriLogger } from '../../logging/index.js';
import { type KoriCompiledRouteMatcher, type KoriRouteId } from '../../route-matcher/index.js';

import { createRouteExecutor } from './route-executor.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type KoriOnStartHookAny = KoriOnStartHook<any, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export function createFetchHandler({
  compiledRouteMatcher,
  allStartHooks,
  loggerFactory,
  instanceLogger,
}: {
  compiledRouteMatcher: KoriCompiledRouteMatcher;
  allStartHooks: KoriOnStartHookAny[];
  loggerFactory: (meta: { channel: string; name: string }) => KoriLogger;
  instanceLogger: KoriLogger;
}): KoriFetchHandler {
  let instanceCtx = createKoriInstanceContext({ env: createKoriEnvironment(), instanceLogger });

  const onStartImpl = async () => {
    for (const startHook of allStartHooks) {
      instanceCtx = (await startHook(instanceCtx)) ?? instanceCtx;
    }

    const fetchHandlerImpl = async (request: Request): Promise<Response> => {
      const routeResult = compiledRouteMatcher(request);
      if (!routeResult) {
        return new Response('Not Found', { status: HttpStatus.NOT_FOUND });
      }
      const executor = createRouteExecutor({
        getRouteRecord: (
          instanceCtx as unknown as { routeRegistry: { get: <_P extends string>(id: KoriRouteId) => unknown } }
        ).routeRegistry.get as unknown as <_P extends string>(id: KoriRouteId) => unknown,
        deps: {
          env: instanceCtx.env as never,
          loggerFactory,
          requestValidator: (instanceCtx as unknown as { requestValidator?: unknown }).requestValidator as never,
          responseValidator: (instanceCtx as unknown as { responseValidator?: unknown }).responseValidator as never,
          onRequestValidationError: (instanceCtx as unknown as { onRequestValidationError?: unknown })
            .onRequestValidationError as never,
          onResponseValidationError: (instanceCtx as unknown as { onResponseValidationError?: unknown })
            .onResponseValidationError as never,
          requestHooks: (instanceCtx as unknown as { requestHooks: unknown[] }).requestHooks as never,
          errorHooks: (instanceCtx as unknown as { errorHooks: unknown[] }).errorHooks as never,
        },
      } as unknown as Parameters<typeof createRouteExecutor>[0]);
      return (
        executor as unknown as {
          executeRoute: <_P extends string>(
            id: KoriRouteId,
            req: Request,
            p: Record<string, string>,
            t: _P,
          ) => Promise<Response>;
        }
      ).executeRoute(
        routeResult.routeId as unknown as KoriRouteId,
        request,
        routeResult.pathParams,
        routeResult.pathTemplate,
      );
    };

    const onCloseImpl = async (): Promise<void> => {
      await executeInstanceDeferredCallbacks(instanceCtx);
    };

    return {
      fetchHandler: fetchHandlerImpl,
      onClose: onCloseImpl,
    };
  };

  return {
    onStart: onStartImpl,
  };
}
