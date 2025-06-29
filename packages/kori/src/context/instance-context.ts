import { type KoriEnvironment } from './environment.js';

export type KoriInstanceContext<Env extends KoriEnvironment> = {
  env: Env;
  withEnv<EnvExt>(envExt: EnvExt): KoriInstanceContext<Env & EnvExt>;
};

export function createKoriInstanceContext<Env extends KoriEnvironment>(env: Env): KoriInstanceContext<Env> {
  return {
    env,
    withEnv: function <EnvExt>(envExt: EnvExt) {
      return createKoriInstanceContext({ ...env, ...envExt });
    },
  };
}
