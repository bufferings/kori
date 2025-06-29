import { type Result } from 'hono/router';
import { RegExpRouter } from 'hono/router/reg-exp-router';
import { SmartRouter } from 'hono/router/smart-router';
import { TrieRouter } from 'hono/router/trie-router';

import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../context/index.js';

import {
  type KoriRouter,
  type KoriRouteOptions,
  type KoriCompiledRouter,
  type KoriRoutingMatch,
  type KoriRouterHandler,
} from './router.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KoriRouterHandlerAny = KoriRouterHandler<any, any, any>;

function convertParams(result: Result<KoriRouterHandlerAny>): Record<string, string> {
  if (result.length === 1) {
    // Params
    return result[0]?.[0]?.[1] ?? {};
  } else if (result.length === 2) {
    // ParamIndexMap
    const paramIndexMap = result[0]?.[0]?.[1];
    if (!paramIndexMap) {
      return {};
    }

    const paramArray = result[1];
    const params: Record<string, string> = {};
    for (const key in paramIndexMap) {
      const index = paramIndexMap[key];
      if (index === undefined) {
        continue;
      }
      const value = paramArray[index];
      if (value === undefined) {
        continue;
      }
      params[key] = value;
    }
    return params;
  }
  return {};
}

export function createHonoRouter(): KoriRouter {
  const router = new SmartRouter<KoriRouterHandlerAny>({
    routers: [new RegExpRouter(), new TrieRouter()],
  });

  return {
    addRoute: <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse, Path extends string>(
      options: KoriRouteOptions<Env, Req, Res, Path>,
    ) => {
      router.add(options.method, options.path, options.handler);
    },

    compile: (): KoriCompiledRouter => {
      return (request: Request): KoriRoutingMatch | undefined => {
        const url = new URL(request.url);

        const method = request.method;
        const path = url.pathname;

        const matched = router.match(method, path);
        if (matched && matched.length > 0 && matched[0].length > 0) {
          const handler = matched[0]?.[0]?.[0];
          if (!handler) {
            return undefined;
          }
          const pathParams = convertParams(matched);
          return {
            handler,
            pathParams,
          };
        }

        return undefined;
      };
    },
  };
}
