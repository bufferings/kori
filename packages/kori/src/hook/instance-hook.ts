import { type KoriEnvironment, type KoriInstanceContext } from '../context/index.js';
import { type MaybePromise } from '../util/index.js';

export type KoriOnStartHook<Env extends KoriEnvironment, EnvExt = unknown> = (
  ctx: KoriInstanceContext<Env>,
) => MaybePromise<KoriInstanceContext<Env & EnvExt> | void>;
