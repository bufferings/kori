import {
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriRequest,
  type KoriResponse,
} from '../context/index.js';

import { defineKoriPlugin, type KoriPlugin } from './plugin.js';

export type SimplePluginConfig<ReqExt = unknown, ResExt = unknown> = {
  name: string;
  onRequest?: (
    ctx: KoriHandlerContext<KoriEnvironment, KoriRequest, KoriResponse>,
  ) => KoriHandlerContext<KoriEnvironment, KoriRequest & ReqExt, KoriResponse & ResExt>;
  onResponse?: (ctx: KoriHandlerContext<KoriEnvironment, KoriRequest & ReqExt, KoriResponse & ResExt>) => void;
  onError?: (
    ctx: KoriHandlerContext<KoriEnvironment, KoriRequest & ReqExt, KoriResponse & ResExt>,
    error: Error,
  ) => void;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
> {
  return <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defineKoriPlugin<Env, Req, Res, unknown, ReqExt, ResExt, any, any>({
      name: config.name,
      apply: (k) => {
        let result = k;
        if (config.onRequest) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
          result = result.onRequest(config.onRequest as any);
        }
        if (config.onResponse) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
          result = result.onResponse(config.onResponse as any);
        }
        if (config.onError) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
          result = result.onError(config.onError as any);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
        return result as any;
      },
    });
}

export function defineRequestExtensionPlugin<T>(
  name: string,
  extender: () => T,
  onResponse?: (ctx: KoriHandlerContext<KoriEnvironment, KoriRequest & T, KoriResponse>) => void,
): <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() => KoriPlugin<
  Env,
  Req,
  Res,
  unknown,
  T,
  unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
> {
  return defineSimplePlugin<T>({
    name,
    onRequest: (ctx) => {
      const extension = extender();
      return ctx.withReq(extension);
    },
    onResponse,
  });
}
