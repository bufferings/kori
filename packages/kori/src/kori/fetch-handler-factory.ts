import {
  createKoriEnvironment,
  createKoriInstanceContext,
  createKoriHandlerContext,
  createKoriRequest,
  createKoriResponse,
} from '../context/index.js';
import { type KoriFetchHandler } from '../fetch-handler/index.js';
import { type KoriOnInitHook, type KoriOnCloseHook } from '../hook/index.js';
import { HttpStatus } from '../http/index.js';
import { type KoriLogger } from '../logging/index.js';
import { type KoriCompiledRouter } from '../router/index.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type KoriOnInitHookAny = KoriOnInitHook<any, any>;
type KoriOnCloseHookAny = KoriOnCloseHook<any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export function createFetchHandler({
  compiledRouter,
  allInitHooks,
  allCloseHooks,
  rootLogger,
}: {
  compiledRouter: KoriCompiledRouter;
  allInitHooks: KoriOnInitHookAny[];
  allCloseHooks: KoriOnCloseHookAny[];
  rootLogger: KoriLogger;
}): KoriFetchHandler {
  let instanceCtx = createKoriInstanceContext(createKoriEnvironment());

  const onInitImpl = async () => {
    for (const initHook of allInitHooks) {
      instanceCtx = (await initHook(instanceCtx)) ?? instanceCtx;
    }

    const fetchHandlerImpl = async (request: Request): Promise<Response> => {
      const routeResult = compiledRouter(request);
      if (!routeResult) {
        return new Response('Not Found', { status: HttpStatus.NOT_FOUND });
      }

      const handlerCtx = createKoriHandlerContext({
        env: instanceCtx.env,
        req: () =>
          createKoriRequest({
            rawRequest: request,
            pathParams: routeResult.pathParams,
            rootLogger,
          }),
        res: createKoriResponse(),
      });

      const res = await routeResult.handler(handlerCtx);
      return res.build();
    };

    const onCloseImpl = async (): Promise<void> => {
      for (const closeHook of allCloseHooks) {
        await closeHook(instanceCtx);
      }
    };

    return {
      fetchHandler: fetchHandlerImpl,
      onClose: onCloseImpl,
    };
  };

  return {
    onInit: onInitImpl,
  };
}
