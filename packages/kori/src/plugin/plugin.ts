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

export function defineKoriRawPlugin<
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
