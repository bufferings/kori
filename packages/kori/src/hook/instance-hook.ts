import { type KoriEnvironment, type KoriInstanceContext } from '../context/index.js';
import { type MaybePromise } from '../util/index.js';

/**
 * Hook function type for Kori instance startup operations.
 *
 * onStart hooks execute once during application initialization, allowing for
 * environment setup, resource initialization, and configuration loading.
 * They can extend the environment with additional properties and register
 * cleanup operations via defer callbacks.
 *
 * @template Env - Current environment type
 * @template EnvExt - Additional environment properties to be added.
 *   Defaults to an empty object, which means no extensions.
 *
 * @param ctx - Instance context for accessing environment and utilities
 * @returns Extended context with additional environment properties, or void
 *
 * @example
 * ```typescript
 * const dbSetupHook: KoriOnStartHook<BaseEnv, { db: Database }> = async (ctx) => {
 *   const db = await connectDatabase(process.env.DATABASE_URL);
 *
 *   // Register cleanup for shutdown
 *   ctx.defer(async () => {
 *     await db.close();
 *   });
 *
 *   return ctx.withEnv({ db });
 * };
 * ```
 */
export type KoriOnStartHook<Env extends KoriEnvironment, EnvExt extends object = object> = (
  ctx: KoriInstanceContext<Env>,
) => MaybePromise<KoriInstanceContext<Env & EnvExt> | void>;
