import {
  createKoriEnvironment,
  createKoriHandlerContext,
  createKoriInstanceContext,
  createKoriRequest,
  createKoriResponse,
  executeInstanceDeferredCallbacks,
  type KoriResponse,
} from '../../context/index.js';
import { type KoriFetchHandler } from '../../fetch-handler/index.js';
import { type KoriOnStartHook } from '../../hook/index.js';
import { type KoriRouteNotFoundHandler } from '../../kori/index.js';
import { createKoriSystemLogger, type KoriLogger, type KoriLoggerFactory } from '../../logging/index.js';
import { type KoriCompiledRouteMatcher } from '../../route-matcher/index.js';

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
 * @param options.compiledRouteMatcher - Pre-compiled route matching function
 * @param options.allStartHooks - Instance startup hooks to execute
 * @param options.loggerFactory - Factory for creating request-scoped loggers
 * @param options.instanceLogger - Logger for instance-level operations
 * @param options.routeRegistry - Registry containing route handlers
 * @param options.onRouteNotFound - Handler for unmatched routes
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
  onRouteNotFound: KoriRouteNotFoundHandler;
}): KoriFetchHandler {
  let instanceCtx = createKoriInstanceContext({ env: createKoriEnvironment(), instanceLogger });

  const onStartImpl = async () => {
    for (const startHook of allStartHooks) {
      instanceCtx = (await startHook(instanceCtx)) ?? instanceCtx;
    }

    const fetchHandlerImpl = async (request: Request): Promise<Response> => {
      const isHead = request.method === 'HEAD';
      const routeMatch = compiledRouteMatcher({ request, methodOverride: isHead ? 'GET' : undefined });
      if (!routeMatch) {
        return await onRouteNotFound(request);
      }

      const routeRecord = routeRegistry.get(routeMatch.routeId);
      if (!routeRecord?.handler) {
        // This should normally never happen - route matcher and registry should be in sync
        const sys = createKoriSystemLogger({ baseLogger: instanceLogger });
        sys.warn('Route not found in registry', {
          type: 'route-not-found',
          routeId: routeMatch.routeId,
        });
        return await onRouteNotFound(request);
      }

      const req = createKoriRequest({
        rawRequest: request,
        pathParams: routeMatch.pathParams,
        pathTemplate: routeRecord.path,
      });

      const handlerCtx = createKoriHandlerContext({
        env: instanceCtx.env,
        req,
        res: createKoriResponse(req),
        loggerFactory,
      });

      const composedHandler = routeRecord.handler as (ctx: typeof handlerCtx) => Promise<KoriResponse>;
      const res = await composedHandler(handlerCtx);
      const response = res.build();

      if (isHead) {
        return new Response(null, response);
      }

      return response;
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
