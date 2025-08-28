import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../context/index.js';
import { type Kori } from '../kori/index.js';
import { type KoriRequestValidatorDefault } from '../validator-request/index.js';
import { type KoriResponseValidatorDefault } from '../validator-response/index.js';

const KoriPluginBrand = Symbol('kori-plugin');

/**
 * Plugin definition for extending Kori instances with additional functionality.
 *
 * Plugins can extend environment, request, and response types while maintaining
 * type safety throughout the application. They follow a functional composition
 * pattern where each plugin transforms a Kori instance into an enhanced version.
 *
 * @template Env - Base environment type
 * @template Req - Base request type
 * @template Res - Base response type
 * @template EnvExt - Environment extensions added by this plugin.
 *   Defaults to an empty object, which means no extensions.
 * @template ReqExt - Request extensions added by this plugin.
 *   Defaults to an empty object, which means no extensions.
 * @template ResExt - Response extensions added by this plugin.
 *   Defaults to an empty object, which means no extensions.
 * @template RequestValidator - Request validation type constraint.
 *   Typically not used in plugins, defaults to any to preserve types.
 * @template ResponseValidator - Response validation type constraint.
 *   Typically not used in plugins, defaults to any to preserve types.
 */
export type KoriPlugin<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  EnvExt extends object = object,
  ReqExt extends object = object,
  ResExt extends object = object,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RequestValidator extends KoriRequestValidatorDefault | undefined = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ResponseValidator extends KoriResponseValidatorDefault | undefined = any,
> = {
  [KoriPluginBrand]: typeof KoriPluginBrand;

  /** Plugin name. Useful for distinguishing between different plugins. */
  name: string;

  /** Plugin version. Helpful for identifying which version of the plugin this is. */
  version?: string;

  /**
   * Function that receives a Kori instance and returns an enhanced version.
   * Adds new functionality and types to the Kori instance.
   *
   * @param kori - The Kori instance to enhance
   * @returns Enhanced Kori instance with extended types
   */
  apply: (
    kori: Kori<Env, Req, Res, RequestValidator, ResponseValidator>,
  ) => Kori<Env & EnvExt, Req & ReqExt, Res & ResExt, RequestValidator, ResponseValidator>;
};

/**
 * Creates a type-safe Kori plugin.
 *
 * Extends Kori functionality and types with type inference support.
 *
 * @template Env - Base environment type
 * @template Req - Base request type
 * @template Res - Base response type
 * @template EnvExt - Environment extensions added by this plugin.
 *   Defaults to an empty object, which means no extensions.
 * @template ReqExt - Request extensions added by this plugin.
 *   Defaults to an empty object, which means no extensions.
 * @template ResExt - Response extensions added by this plugin.
 *   Defaults to an empty object, which means no extensions.
 * @template RequestValidator - Request validation type constraint.
 *   Typically not used in plugins, defaults to any to preserve types.
 * @template ResponseValidator - Response validation type constraint.
 *   Typically not used in plugins, defaults to any to preserve types.
 *
 * @param params - Plugin configuration
 * @param params.name - Plugin name, useful for distinguishing between different plugins
 * @param params.version - Plugin version, helpful for identifying which version this is
 * @param params.apply - Function that receives a Kori instance and returns an enhanced version.
 *   Adds new functionality and types to the Kori instance.
 * @returns Kori plugin object ready for use
 *
 * @example
 * Creating polymorphic plugins that work with any Kori instance:
 * ```typescript
 * const authPlugin = <Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>() =>
 *   defineKoriPlugin<Env, Req, Res, { region: string }, { userId: string }>({
 *     name: 'auth',
 *     version: '1.0.0',
 *     apply: (kori) => kori
 *       .onStart((ctx) => ctx.withEnv({ region: 'us-west' }))
 *       .onRequest((ctx) => ctx.withReq({ userId: 'user-123' }))
 *   });
 *
 * // Polymorphic form ensures type information flows correctly
 * const app = createKori().applyPlugin(authPlugin());
 * ```
 */
export function defineKoriPlugin<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  EnvExt extends object = object,
  ReqExt extends object = object,
  ResExt extends object = object,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RequestValidator extends KoriRequestValidatorDefault | undefined = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ResponseValidator extends KoriResponseValidatorDefault | undefined = any,
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
