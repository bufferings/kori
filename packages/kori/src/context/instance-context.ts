import { SYS_CHANNEL, type KoriLogger } from '../logging/index.js';
import { type MaybePromise } from '../util/index.js';

import { type KoriEnvironment } from './environment.js';

export type KoriInstanceContext<Env extends KoriEnvironment> = {
  env: Env;
  withEnv<EnvExt>(envExt: EnvExt): KoriInstanceContext<Env & EnvExt>;
  defer(callback: (ctx: KoriInstanceContext<Env>) => MaybePromise<void>): void;
  log(): KoriLogger;
};

// --- Internal Implementation ---

type KoriInstanceContextBase = KoriInstanceContext<KoriEnvironment>;

type InstanceCtxState = {
  env: KoriEnvironment;
  deferStack: ((ctx: KoriInstanceContextBase) => MaybePromise<void>)[];
  loggerFactory: (meta: { channel: string; name: string }) => KoriLogger;
  loggerCache?: KoriLogger;
};

const instanceContextPrototype = {
  withEnv<EnvExt extends object>(this: InstanceCtxState, envExt: EnvExt) {
    Object.assign(this.env, envExt);
    return this;
  },

  defer(this: InstanceCtxState, callback: (ctx: KoriInstanceContextBase) => MaybePromise<void>) {
    this.deferStack.push(callback);
  },

  log(this: InstanceCtxState) {
    this.loggerCache ??= this.loggerFactory({ channel: 'app', name: 'instance' });
    return this.loggerCache;
  },
};

export function createKoriInstanceContext<Env extends KoriEnvironment>({
  env,
  loggerFactory,
}: {
  env: Env;
  loggerFactory: (meta: { channel: string; name: string }) => KoriLogger;
}): KoriInstanceContext<Env> {
  const ctx = Object.create(instanceContextPrototype) as InstanceCtxState;
  ctx.env = env;
  ctx.deferStack = [];
  ctx.loggerFactory = loggerFactory;
  return ctx as unknown as KoriInstanceContext<Env>;
}

// Internal function to execute deferred callbacks for instance context
export async function executeInstanceDeferredCallbacks(ctx: KoriInstanceContextBase): Promise<void> {
  const ctxState = ctx as unknown as InstanceCtxState;
  const deferStack = ctxState.deferStack;

  // Execute in reverse order (LIFO)
  for (let i = deferStack.length - 1; i >= 0; i--) {
    try {
      await deferStack[i]?.(ctx);
    } catch (err) {
      ctx.log().channel(SYS_CHANNEL).child('defer-callback').error('Instance defer callback error', { err });
    }
  }
}
