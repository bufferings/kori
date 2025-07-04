import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../context/index.js';
import { type Kori } from '../kori/index.js';
import { type KoriRequestValidatorDefault } from '../request-validation/index.js';
import { type KoriResponseValidatorDefault } from '../response-validation/index.js';

const KoriPluginBrand = Symbol('kori-plugin');

export type KoriPlugin<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  EnvExt = unknown,
  ReqExt = unknown,
  ResExt = unknown,
  RequestValidator extends KoriRequestValidatorDefault | undefined = undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined = undefined,
> = {
  [KoriPluginBrand]: typeof KoriPluginBrand;
  name: string;
  version?: string;
  apply: (
    kori: Kori<Env, Req, Res, RequestValidator, ResponseValidator>,
  ) => Kori<Env & EnvExt, Req & ReqExt, Res & ResExt, RequestValidator, ResponseValidator>;
};

export type KoriPluginDefault = KoriPlugin<
  KoriEnvironment,
  KoriRequest,
  KoriResponse,
  unknown,
  unknown,
  unknown,
  KoriRequestValidatorDefault | undefined,
  KoriResponseValidatorDefault | undefined
>;

export function isKoriPlugin(value: unknown): value is KoriPluginDefault {
  return typeof value === 'object' && value !== null && KoriPluginBrand in value;
}

export function defineKoriPlugin<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  EnvExt = unknown,
  ReqExt = unknown,
  ResExt = unknown,
  RequestValidator extends KoriRequestValidatorDefault | undefined = undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined = undefined,
>(params: {
  name: string;
  version?: string;
  apply: (
    kori: Kori<Env, Req, Res, RequestValidator, ResponseValidator>,
  ) => Kori<Env & EnvExt, Req & ReqExt, Res & ResExt, RequestValidator, ResponseValidator>;
}): KoriPlugin<Env, Req, Res, EnvExt, ReqExt, ResExt, RequestValidator, ResponseValidator> {
  return {
    [KoriPluginBrand]: KoriPluginBrand,
    name: params.name,
    version: params.version,
    apply: params.apply,
  };
}

// New type-inferred plugin definition function
export function defineKoriSimplePlugin(params: {
  name: string;
  version?: string;
  // Lifestyle Hooks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onInit?: () => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onClose?: (ctx: any) => void;
  // Handler Hooks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRequest?: (ctx: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onResponse?: (ctx: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError?: (ctx: any, err: unknown) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFinally?: (ctx: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): KoriPlugin<any, any, any, any, any, any, any, any> {
  return {
    [KoriPluginBrand]: KoriPluginBrand,
    name: params.name,
    version: params.version,
    apply: (kori) => {
      let result = kori;

      if (params.onInit) {
        result = result.onInit((ctx) => {
          const envExt = params.onInit!();
          return ctx.withEnv(envExt);
        });
      }

      if (params.onClose) {
        result = result.onClose((ctx) => {
          params.onClose!(ctx);
        });
      }

      if (params.onRequest) {
        result = result.onRequest((ctx) => {
          const reqExt = params.onRequest!(ctx);
          return ctx.withReq(reqExt);
        });
      }

      if (params.onResponse) {
        result = result.onResponse((ctx) => {
          params.onResponse!(ctx);
        });
      }

      if (params.onError) {
        result = result.onError((ctx, err) => {
          params.onError!(ctx, err);
        });
      }

      if (params.onFinally) {
        result = result.onFinally((ctx) => {
          params.onFinally!(ctx);
        });
      }

      return result;
    },
  };
}
