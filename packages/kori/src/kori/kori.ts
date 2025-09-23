import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../context/index.js';
import { type KoriFetchHandler } from '../fetch-handler/index.js';
import { type KoriOnErrorHook, type KoriOnRequestHook, type KoriOnStartHook } from '../hook/index.js';
import { type KoriLogger } from '../logging/index.js';
import { type KoriPlugin } from '../plugin/index.js';
import { type KoriRouteDefinition, type KoriRoute, type KoriRouteMethod } from '../routing/index.js';
import { type KoriValidatorBase } from '../validator/index.js';

/**
 * Kori instance providing type-safe HTTP server functionality.
 *
 * The Kori instance supports method chaining for configuration and provides
 * type-safe route registration, lifecycle hooks, plugin system, and request/response
 * validation. All type extensions are preserved through the fluent API.
 *
 * @template Env - Environment type containing instance-specific data
 * @template Req - Request type with request-specific data and methods
 * @template Res - Response type with response building capabilities
 * @template ReqV - Request validation configuration for type-safe request validation
 * @template ResV - Response validation configuration for type-safe response validation
 *
 * @example
 * ```typescript
 * const app = createKori()
 *   .onStart(async (ctx) => {
 *     const db = await connectDatabase();
 *     ctx.defer(() => db.close());
 *     return ctx.withEnv({ db });
 *   })
 *   .onRequest((ctx) => {
 *     ctx.log().info('Request received', { path: ctx.req.url() });
 *     return ctx;
 *   })
 *   .get('/health', (ctx) => ctx.res.text('OK'))
 *   .post('/users', {
 *     requestSchema: userCreateSchema,
 *     handler: (ctx) => {
 *       const userData = ctx.req.validatedBody();
 *       return ctx.res.json(createUser(userData));
 *     }
 *   });
 * ```
 */
export type Kori<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  ReqV extends KoriValidatorBase | undefined = undefined,
  ResV extends KoriValidatorBase | undefined = undefined,
> = {
  /** Gets the instance logger for this Kori instance */
  log(): KoriLogger;

  /** Registers a startup hook that executes during instance initialization */
  onStart<EnvExt extends object>(hook: KoriOnStartHook<Env, EnvExt>): Kori<Env & EnvExt, Req, Res, ReqV, ResV>;

  /** Registers a request hook that executes before each route handler */
  onRequest<ReqExt extends object, ResExt extends object>(
    hook: KoriOnRequestHook<Env, Req, Res, ReqExt, ResExt>,
  ): Kori<Env, Req & ReqExt, Res & ResExt, ReqV, ResV>;

  /** Registers an error hook that executes when errors occur during request processing */
  onError(hook: KoriOnErrorHook<Env, Req, Res>): Kori<Env, Req, Res, ReqV, ResV>;

  /** Applies a plugin to extend the Kori instance with additional functionality */
  applyPlugin<EnvExt extends object, ReqExt extends object, ResExt extends object>(
    plugin: KoriPlugin<Env, Req, Res, EnvExt, ReqExt, ResExt>,
  ): Kori<Env & EnvExt, Req & ReqExt, Res & ResExt, ReqV, ResV>;

  /** Creates a child instance with optional path prefix and configuration */
  createChild<EnvExt extends object, ReqExt extends object, ResExt extends object>(childOptions?: {
    configure: (kori: Kori<Env, Req, Res, ReqV, ResV>) => Kori<Env & EnvExt, Req & ReqExt, Res & ResExt, ReqV, ResV>;
    prefix?: string;
  }): Kori<Env & EnvExt, Req & ReqExt, Res & ResExt, ReqV, ResV>;

  /** Generic route registration for any HTTP method */
  route: KoriRoute<Env, Req, Res, ReqV, ResV>;

  /** Registers a GET route */
  get: KoriRouteMethod<Env, Req, Res, ReqV, ResV>;
  /** Registers a POST route */
  post: KoriRouteMethod<Env, Req, Res, ReqV, ResV>;
  /** Registers a PUT route */
  put: KoriRouteMethod<Env, Req, Res, ReqV, ResV>;
  /** Registers a DELETE route */
  delete: KoriRouteMethod<Env, Req, Res, ReqV, ResV>;
  /** Registers a PATCH route */
  patch: KoriRouteMethod<Env, Req, Res, ReqV, ResV>;
  /** Registers a HEAD route */
  head: KoriRouteMethod<Env, Req, Res, ReqV, ResV>;
  /** Registers an OPTIONS route */
  options: KoriRouteMethod<Env, Req, Res, ReqV, ResV>;

  /** Generates a fetch handler for deployment to runtime environments */
  generate(): KoriFetchHandler;

  /** Returns all registered route definitions for introspection */
  routeDefinitions(): KoriRouteDefinition[];
};
