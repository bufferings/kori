import { type MaybePromise } from '../util/index.js';

import { type KoriEnvironment } from './environment.js';

export type KoriInstanceContext<Env extends KoriEnvironment> = {
  env: Env;
  withEnv<EnvExt>(envExt: EnvExt): KoriInstanceContext<Env & EnvExt>;
  defer(callback: (ctx: KoriInstanceContext<Env>) => MaybePromise<void>): void;
};

// --- Internal Implementation ---

type KoriInstanceContextBase = KoriInstanceContext<KoriEnvironment>;

type InstanceCtxState = {
  env: KoriEnvironment;
  deferStack: ((ctx: KoriInstanceContextBase) => MaybePromise<void>)[];
};

const instanceContextPrototype = {
  withEnv<EnvExt extends object>(this: InstanceCtxState, envExt: EnvExt) {
    Object.assign(this.env, envExt);
    return this;
  },

  defer(this: InstanceCtxState, callback: (ctx: KoriInstanceContextBase) => MaybePromise<void>) {
    this.deferStack.push(callback);
  },
};

export function createKoriInstanceContext<Env extends KoriEnvironment>(env: Env): KoriInstanceContext<Env> {
  const ctx = Object.create(instanceContextPrototype) as InstanceCtxState;
  ctx.env = env;
  ctx.deferStack = [];
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
    } catch (error) {
      // TODO: Log error
      // eslint-disable-next-line no-console
      console.error('Instance defer callback error:', error);
    }
  }
}
