import { KoriLoggerUtils } from '../logging/index.js';
import { serializeError, type KoriLogger } from '../logging/index.js';
import { type MaybePromise } from '../util/index.js';

import { type KoriEnvironment } from './environment.js';

export type KoriInstanceContext<Env extends KoriEnvironment> = {
  env: Env;

  withEnv<EnvExt>(envExt: EnvExt): KoriInstanceContext<Env & EnvExt>;

  defer(callback: (ctx: KoriInstanceContext<Env>) => MaybePromise<void>): void;

  log(): KoriLogger;
  createSysLogger(): KoriLogger;
  createPluginLogger(pluginName: string): KoriLogger;
};

// --- Internal Implementation ---

type KoriInstanceContextBase = KoriInstanceContext<KoriEnvironment>;

type InstanceCtxState = {
  env: KoriEnvironment;
  deferStack: ((ctx: KoriInstanceContextBase) => MaybePromise<void>)[];
  instanceLogger: KoriLogger;
};

function createSysLogger(ctx: InstanceCtxState) {
  return KoriLoggerUtils.createSysLogger({
    logger: ctx.instanceLogger,
  });
}

function createPluginLogger(ctx: InstanceCtxState, pluginName: string) {
  return KoriLoggerUtils.createPluginLogger({
    logger: ctx.instanceLogger,
    pluginName,
  });
}

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

  createSysLogger(this: InstanceCtxState) {
    return createSysLogger(this);
  },

  createPluginLogger(this: InstanceCtxState, pluginName: string) {
    return createPluginLogger(this, pluginName);
  },
};

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

// Internal function to execute deferred callbacks for instance context
export async function executeInstanceDeferredCallbacks(ctx: KoriInstanceContextBase): Promise<void> {
  const ctxState = ctx as unknown as InstanceCtxState;
  const deferStack = ctxState.deferStack;

  // Execute in reverse order (LIFO)
  for (let i = deferStack.length - 1; i >= 0; i--) {
    try {
      await deferStack[i]?.(ctx);
    } catch (err) {
      ctx.createSysLogger().error('Instance defer callback error', {
        type: 'defer-callback',
        err: serializeError(err),
      });
    }
  }
}
