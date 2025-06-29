import { type KoriEnvironment, type KoriInstanceContext } from '../context/index.js';
import { type MaybePromise } from '../util/index.js';

export type KoriOnInitHook<Env extends KoriEnvironment, EnvExt = unknown> = (
  ctx: KoriInstanceContext<Env>,
) => MaybePromise<KoriInstanceContext<Env & EnvExt> | void>;

export type KoriOnCloseHook<Env extends KoriEnvironment> = (ctx: KoriInstanceContext<Env>) => MaybePromise<void>;
