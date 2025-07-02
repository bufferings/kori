import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../context/index.js';

import { defineKoriPlugin, type KoriPlugin } from './plugin.js';

export type SimplePluginConfig<_ReqExt = unknown, _ResExt = unknown> = {
  name: string;
  onRequest?: <Ctx>(ctx: Ctx) => Ctx;
  onResponse?: <Ctx>(ctx: Ctx) => void;
  onError?: <Ctx>(ctx: Ctx, error: Error) => void;
};

export function defineSimplePlugin<ReqExt = unknown, ResExt = unknown>(
  config: SimplePluginConfig<ReqExt, ResExt>,
): <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() => KoriPlugin<
  Env,
  Req,
  Res,
  unknown,
  ReqExt,
  ResExt,
  undefined,
  undefined
> {
  return <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
    defineKoriPlugin<Env, Req, Res, unknown, ReqExt, ResExt, undefined, undefined>({
      name: config.name,
      apply: (k) => {
        let result = k;
        if (config.onRequest) {
          result = result.onRequest(config.onRequest as never);
        }
        if (config.onResponse) {
          result = result.onResponse(config.onResponse as never);
        }
        if (config.onError) {
          result = result.onError(config.onError as never);
        }
        return result as never;
      },
    });
}

export function defineRequestExtensionPlugin<T>(
  name: string,
  extender: <Ctx>(ctx: Ctx) => T,
  onResponse?: <Ctx>(ctx: Ctx) => void,
): <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() => KoriPlugin<
  Env,
  Req,
  Res,
  unknown,
  T,
  unknown,
  undefined,
  undefined
> {
  return defineSimplePlugin<T>({
    name,
    onRequest: (ctx) => {
      const extension = extender(ctx);
      const contextWithReq = ctx as { withReq: (ext: T) => typeof ctx };
      return contextWithReq.withReq(extension);
    },
    onResponse,
  });
}
