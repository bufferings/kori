import { type KoriSchemaDefault, type KoriSchemaFor } from '../schema/index.js';

import { type KoriRequestSchemaSimpleBody } from './body-simple.js';
import {
  type KoriRequestSchemaBody,
  type KoriRequestSchemaBodyItem,
  type KoriRequestSchemaBodyMappingDefault,
} from './body.js';

/**
 * Schema definition that describes the structure of an HTTP request.
 *
 * The request body supports two formats:
 * - Simple body: convenient format for application/json content
 * - Content body: flexible format for any content type
 *
 * @template Provider - Unique symbol identifying the schema provider
 * @template Params - Schema for URL path parameters
 * @template Headers - Schema for HTTP headers
 * @template Queries - Schema for query string parameters
 * @template Body - Schema for simple request body
 * @template BodyMapping - Record mapping media types to schema definitions
 *
 * @example
 * ```typescript
 * // Simple body: Direct schema
 * {
 *   params: paramsSchema,
 *   headers: headersSchema,
 *   queries: queriesSchema,
 *   body: userSchema
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Simple body: With description and examples
 * {
 *   params: paramsSchema,
 *   body: {
 *     description: 'User registration data',
 *     schema: userSchema,
 *     examples: {
 *       sample: { name: 'Alice', email: 'alice@example.com' }
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Content body: Flexible format for any content type
 * {
 *   params: paramsSchema,
 *   body: {
 *     description: 'Contact form submission',
 *     content: {
 *       'application/x-www-form-urlencoded': {
 *         schema: contactFormSchema,
 *         examples: {
 *           business: { company: 'Acme Inc', email: 'contact@acme.com' }
 *         }
 *       }
 *     }
 *   }
 * }
 * ```
 */
export type KoriRequestSchema<
  Provider extends symbol,
  Params extends KoriSchemaFor<Provider> = never,
  Headers extends KoriSchemaFor<Provider> = never,
  Queries extends KoriSchemaFor<Provider> = never,
  Body extends KoriSchemaFor<Provider> = never,
  BodyMapping extends Record<string, KoriRequestSchemaBodyItem<KoriSchemaFor<Provider>>> = never,
> = {
  params?: Params;
  headers?: Headers;
  queries?: Queries;
  body?: KoriRequestSchemaSimpleBody<Body> | KoriRequestSchemaBody<BodyMapping>;
};

/**
 * Default request schema type accepting any provider and schema definitions.
 */
export type KoriRequestSchemaDefault = KoriRequestSchema<
  symbol,
  KoriSchemaDefault,
  KoriSchemaDefault,
  KoriSchemaDefault,
  KoriSchemaDefault,
  KoriRequestSchemaBodyMappingDefault
>;
