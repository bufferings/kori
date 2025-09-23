import { type KoriLogger, createKoriSystemLogger } from '../logging/index.js';
import { type MaybePromise } from '../util/index.js';

import { type KoriEnvironment } from './environment.js';

/**
 * Instance context provides access to environment and utilities for
 * Kori instance-level operations and configuration.
 *
 * The instance context manages instance-wide state, logging, and deferred
 * callbacks that execute during instance shutdown.
 *
 * @template Env - Environment type containing instance-specific data and configuration
 */
export type KoriInstanceContext<Env extends KoriEnvironment> = {
  /** Current environment containing instance-specific data and configuration */
  env: Env;

  /**
   * Extends the environment object with additional properties.
   *
   * **Performance Note**: This method mutates the existing environment object
   * rather than creating a new one for hot path optimization.
   *
   * @param envExt - Additional properties to add to the environment
   * @returns The same context instance with extended environment type
   *
   * @example
   * ```typescript
   * // Setup database and cache during instance startup
   * const instanceCtx = ctx.withEnv({
   *   db: await connectDatabase(process.env.DATABASE_URL),
   *   cache: await connectRedis(process.env.REDIS_URL),
   *   config: {
   *     maxConnections: 100,
   *     timeout: 5000
   *   }
   * });
   *
   * // Now available throughout the application
   * app.get('/users', (ctx) => {
   *   return ctx.env.db.users.findMany();
   * });
   * ```
   */
  withEnv<EnvExt extends object>(envExt: EnvExt): KoriInstanceContext<Env & EnvExt>;

  /**
   * Registers a callback to be executed when the instance shuts down.
   *
   * Deferred callbacks are executed in LIFO order (last registered, first executed)
   * and are used for cleanup operations like closing database connections,
   * releasing resources, or finalizing logs during shutdown.
   *
   * @param callback - Function to execute during instance lifecycle
   *
   * @example
   * ```typescript
   * // Cleanup during instance shutdown
   * ctx.defer(async (ctx) => {
   *   ctx.log().info('Starting shutdown cleanup');
   *
   *   // Close database connections
   *   await ctx.env.db.close();
   *
   *   // Close cache connections
   *   await ctx.env.cache.quit();
   *
   *   // Cleanup temporary files
   *   await fs.rmdir(ctx.env.tempDir, { recursive: true });
   *
   *   ctx.log().info('Shutdown cleanup completed');
   * });
   * ```
   */
  defer(callback: (ctx: KoriInstanceContext<Env>) => MaybePromise<void>): void;

  /**
   * Gets the instance logger for this Kori instance.
   *
   * Uses channel 'app' and name 'instance' for instance-level logging.
   *
   * @returns Instance logger instance
   */
  log(): KoriLogger;
};

/** Base instance context type for internal use */
type KoriInstanceContextBase = KoriInstanceContext<KoriEnvironment>;

/** Internal state structure for instance context */
type InstanceCtxState = {
  env: KoriEnvironment;
  deferStack: ((ctx: KoriInstanceContextBase) => MaybePromise<void>)[];
  instanceLogger: KoriLogger;
};

/** Shared methods prototype for memory efficiency */
const instanceContextPrototype = {
  withEnv<EnvExt extends object>(this: InstanceCtxState, envExt: EnvExt) {
    Object.assign(this.env, envExt);
    return this;
  },

  defer(this: InstanceCtxState, callback: (ctx: KoriInstanceContextBase) => MaybePromise<void>) {
    this.deferStack.push(callback);
  },

  log(this: InstanceCtxState) {
    return this.instanceLogger;
  },
};

/**
 * Creates a new instance context.
 *
 * @packageInternal Framework infrastructure for creating instance contexts
 *
 * @param options.env - Environment object
 * @param options.instanceLogger - Logger instance for this context
 * @returns New instance context
 */
export function createKoriInstanceContext<Env extends KoriEnvironment>({
  env,
  instanceLogger,
}: {
  env: Env;
  instanceLogger: KoriLogger;
}): KoriInstanceContext<Env> {
  const ctx = Object.create(instanceContextPrototype) as InstanceCtxState;
  ctx.env = env;
  ctx.deferStack = [];
  ctx.instanceLogger = instanceLogger;
  return ctx as unknown as KoriInstanceContext<Env>;
}

/**
 * Executes all deferred callbacks registered during instance operations.
 *
 * @packageInternal Framework infrastructure for executing deferred callbacks
 *
 * Callbacks are executed in LIFO order (last registered, first executed).
 * If any callback throws an error, it's logged but doesn't prevent other
 * callbacks from executing.
 *
 * @param ctx - Instance context containing deferred callbacks
 */
export async function executeInstanceDeferredCallbacks(ctx: KoriInstanceContextBase): Promise<void> {
  const ctxState = ctx as unknown as InstanceCtxState;
  const deferStack = ctxState.deferStack;

  // Execute in reverse order (LIFO)
  for (let i = deferStack.length - 1; i >= 0; i--) {
    try {
      await deferStack[i]?.(ctx);
    } catch (err) {
      const sys = createKoriSystemLogger({ baseLogger: ctxState.instanceLogger });
      sys.error('Instance defer callback error', {
        type: 'defer-callback',
        err: sys.serializeError(err),
      });
    }
  }
}
