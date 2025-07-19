import { type KoriRequest } from '@korix/kori';

type CorsOptionsBase = {
  /**
   * Configures the Access-Control-Allow-Methods header
   * Default: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE']
   */
  allowMethods?: string[];

  /**
   * Configures the Access-Control-Allow-Headers header
   * - string[]: specific headers
   */
  allowHeaders?: string[];

  /**
   * Configures the Access-Control-Expose-Headers header
   */
  exposeHeaders?: string[];

  /**
   * Configures the Access-Control-Max-Age header
   * Default: 86400 (24 hours)
   */
  maxAge?: number;

  /**
   * Success status code for preflight requests
   * Default: 204
   */
  optionsSuccessStatus?: number;
};

type OriginOptionsWithCredentials = {
  /**
   * Configures the Access-Control-Allow-Credentials header.
   * When set to `true`, `origin` cannot be a wildcard (`true`).
   */
  credentials: true;
  /**
   * Configures the Access-Control-Allow-Origin header.
   * - string: specific origin
   * - string[]: array of allowed origins
   * - function: dynamic origin validation
   */
  origin: string | string[] | ((origin: string, req: KoriRequest) => boolean);
};

type OriginOptionsWithoutCredentials = {
  /**
   * Configures the Access-Control-Allow-Credentials header.
   * Can be `false` or omitted.
   */
  credentials?: false;
  /**
   * Configures the Access-Control-Allow-Origin header.
   * - string: specific origin
   * - string[]: array of allowed origins
   * - boolean: true for '*', false to disable
   * - function: dynamic origin validation
   */
  origin?: string | string[] | boolean | ((origin: string, req: KoriRequest) => boolean);
};

export type CorsPluginOptions = CorsOptionsBase & (OriginOptionsWithCredentials | OriginOptionsWithoutCredentials);
