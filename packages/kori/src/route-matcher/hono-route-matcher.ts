import { type Result } from 'hono/router';
import { RegExpRouter } from 'hono/router/reg-exp-router';
import { SmartRouter } from 'hono/router/smart-router';
import { TrieRouter } from 'hono/router/trie-router';
import { getPath } from 'hono/utils/url';

import {
  type KoriRouteId,
  type KoriRouteMatch,
  type KoriCompiledRouteMatcher,
  type KoriRouteMatcher,
} from './route-matcher.js';

type MatchedValue = { routeId: KoriRouteId; pathTemplate: string };

/**
 * Convert Hono router match result into a name->value params map.
 *
 * Hono returns two possible shapes for params:
 * - length === 1: result[0][0][1] contains a record of paramName->value
 * - length === 2: result[0][0][1] contains paramName->index, and result[1]
 *   is an array of captured values; this function maps names to those values
 *
 * This helper normalizes both shapes to Record<string, string> for Kori.
 *
 * @param result - Hono router match result
 * @returns Map of param name to value extracted from the match
 */
function convertParams(result: Result<MatchedValue>): Record<string, string> {
  if (result.length === 1) {
    return result[0]?.[0]?.[1] ?? {};
  } else if (result.length === 2) {
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

/**
 * Create a KoriRouteMatcher using Hono's SmartRouter (RegExpRouter + TrieRouter).
 * Implements the KoriRouteMatcher contract.
 *
 * @returns Route matcher implementation for Kori
 */
export function createHonoRouteMatcher(): KoriRouteMatcher {
  const router = new SmartRouter<MatchedValue>({
    routers: [new RegExpRouter(), new TrieRouter()],
  });

  return {
    addRoute: (options: { method: string; path: string; routeId: KoriRouteId }) => {
      const normalizedMethod = options.method.toUpperCase();
      const value: MatchedValue = {
        routeId: options.routeId,
        pathTemplate: options.path,
      };
      router.add(normalizedMethod, options.path, value);
    },

    compile: (): KoriCompiledRouteMatcher => {
      return (request: Request): KoriRouteMatch | undefined => {
        const method = request.method.toUpperCase();
        const path = getPath(request);

        const matched = router.match(method, path);
        const value = matched[0]?.[0]?.[0];
        if (!value) {
          return undefined;
        }

        const pathParams = convertParams(matched);
        const { routeId, pathTemplate } = value;
        return { routeId, pathParams, pathTemplate };
      };
    },
  };
}
