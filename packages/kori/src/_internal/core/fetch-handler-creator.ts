import {
  createKoriEnvironment,
  createKoriInstanceContext,
  executeInstanceDeferredCallbacks,
  createKoriHandlerContext,
  createKoriRequest,
  createKoriResponse,
  type KoriResponse,
} from '../../context/index.js';
import { type KoriFetchHandler } from '../../fetch-handler/index.js';
import { type KoriOnStartHook } from '../../hook/index.js';
import { HttpStatus } from '../../http/index.js';
import { type KoriLogger } from '../../logging/index.js';
import { type KoriCompiledRouteMatcher, type KoriRouteId } from '../../route-matcher/index.js';

import { type RouteRecord } from './route-registry.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type KoriOnStartHookAny = KoriOnStartHook<any, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export function createFetchHandler({
  compiledRouteMatcher,
  allStartHooks,
  loggerFactory,
  instanceLogger,
  routeRegistry,
}: {
  compiledRouteMatcher: KoriCompiledRouteMatcher;
  allStartHooks: KoriOnStartHookAny[];
  loggerFactory: (meta: { channel: string; name: string }) => KoriLogger;
  instanceLogger: KoriLogger;
  routeRegistry: { get: (id: KoriRouteId) => RouteRecord | undefined };
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

      // Get composed handler from registry
      const routeRecord = routeRegistry.get(routeResult.routeId);

      if (!routeRecord?.handler) {
        return new Response('Not Found', { status: HttpStatus.NOT_FOUND });
      }

      const req = createKoriRequest({
        rawRequest: request,
        pathParams: routeResult.pathParams,
        pathTemplate: routeResult.pathTemplate,
      });

      const handlerCtx = createKoriHandlerContext({
        env: instanceCtx.env,
        req,
        res: createKoriResponse(req),
        loggerFactory,
      });

      // Execute composed handler directly
      const composedHandler = routeRecord.handler as (ctx: typeof handlerCtx) => Promise<KoriResponse>;
      const res = await composedHandler(handlerCtx);
      return res.build();
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
