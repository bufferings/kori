import {
  createKoriEnvironment,
  createKoriInstanceContext,
  createKoriHandlerContext,
  createKoriRequest,
  createKoriResponse,
  executeInstanceDeferredCallbacks,
} from '../context/index.js';
import { type KoriFetchHandler } from '../fetch-handler/index.js';
import { type KoriOnStartHook } from '../hook/index.js';
import { HttpStatus } from '../http/index.js';
import { type KoriLogger } from '../logging/index.js';
import { type KoriCompiledRouter } from '../router/index.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type KoriOnStartHookAny = KoriOnStartHook<any, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export function createFetchHandler({
  compiledRouter,
  allStartHooks,
  loggerFactory,
  instanceLogger,
}: {
  compiledRouter: KoriCompiledRouter;
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
      const routeResult = compiledRouter(request);
      if (!routeResult) {
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

      const res = await routeResult.handler(handlerCtx);
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
