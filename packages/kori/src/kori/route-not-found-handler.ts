import { HttpStatus } from '../http/index.js';
import { type MaybePromise } from '../util/index.js';

/**
 * Handler function for processing requests that don't match any registered routes.
 *
 * @param req - The unmatched HTTP request
 * @returns Response for the unmatched request
 */
export type KoriRouteNotFoundHandler = (req: Request) => MaybePromise<Response>;

/**
 * Creates default route not found handler that returns plain text response.
 *
 * @packageInternal
 */
export function createDefaultRouteNotFoundHandler(): KoriRouteNotFoundHandler {
  return (_req: Request) => new Response('Not Found', { status: HttpStatus.NOT_FOUND });
}
