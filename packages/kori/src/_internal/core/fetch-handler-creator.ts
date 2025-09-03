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
import { type KoriLogger, type KoriLoggerFactory } from '../../logging/index.js';
import { type KoriCompiledRouteMatcher } from '../../route-matcher/index.js';
import { type MaybePromise } from '../../util/index.js';

import { type KoriRouteRegistry } from './route-registry.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type KoriOnStartHookAny = KoriOnStartHook<any, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Creates a fetch handler for processing HTTP requests.
 *
 * Builds the main HTTP request handler that matches routes, executes pre-built
 * handlers, and handles not found cases using shared configuration. Integrates
 * start hooks and manages instance lifecycle.
 *
 * @param options - Configuration for fetch handler creation
 * @returns Fetch handler with onStart lifecycle method
 *
 * @internal
 */
export function createFetchHandler({
  compiledRouteMatcher,
  allStartHooks,
  loggerFactory,
  instanceLogger,
  routeRegistry,
  onRouteNotFound,
}: {
  compiledRouteMatcher: KoriCompiledRouteMatcher;
  allStartHooks: KoriOnStartHookAny[];
  loggerFactory: KoriLoggerFactory;
  instanceLogger: KoriLogger;
  routeRegistry: KoriRouteRegistry;
  onRouteNotFound: (req: Request) => MaybePromise<Response>;
}): KoriFetchHandler {
  let instanceCtx = createKoriInstanceContext({ env: createKoriEnvironment(), instanceLogger });

  const onStartImpl = async () => {
    for (const startHook of allStartHooks) {
      instanceCtx = (await startHook(instanceCtx)) ?? instanceCtx;
    }

    const fetchHandlerImpl = async (request: Request): Promise<Response> => {
      const routeMatch = compiledRouteMatcher(request);
      if (!routeMatch) {
        return await onRouteNotFound(request);
      }

      const routeRecord = routeRegistry.get(routeMatch.routeId);
      if (!routeRecord?.handler) {
        return await onRouteNotFound(request);
      }

      const req = createKoriRequest({
        rawRequest: request,
        pathParams: routeMatch.pathParams,
        pathTemplate: routeMatch.pathTemplate,
      });

      const handlerCtx = createKoriHandlerContext({
        env: instanceCtx.env,
        req,
        res: createKoriResponse(req),
        loggerFactory,
      });

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
