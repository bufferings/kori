import { type KoriRequest } from '@korix/kori';

export type CorsPluginOptions = {
  /**
   * Configures the Access-Control-Allow-Origin header
   * - string: specific origin
   * - string[]: array of allowed origins
   * - boolean: true for '*', false to disable
   * - function: dynamic origin validation
   */
  origin?: string | string[] | boolean | ((origin: string | undefined, req: KoriRequest) => boolean);

  /**
   * Configures the Access-Control-Allow-Credentials header
   * Default: false
   */
  credentials?: boolean;

  /**
   * Configures the Access-Control-Allow-Methods header
   * Default: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE']
   */
  allowMethods?: string[];

  /**
   * Configures the Access-Control-Allow-Headers header
   * - string[]: specific headers
   * - boolean: true to reflect request headers, false to disable
   */
  allowHeaders?: string[] | boolean;

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
