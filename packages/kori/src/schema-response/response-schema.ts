import { type KoriSchemaDefault, type KoriSchemaFor } from '../schema/index.js';

import { type KoriResponseSchemaSimpleBody } from './body-simple.js';
import {
  type KoriResponseSchemaBody,
  type KoriResponseSchemaBodyItem,
  type KoriResponseSchemaBodyMappingDefault,
} from './body.js';

/**
 * Pattern matching for HTTP status codes including wildcards.
 *
 * Supports specific status codes, class wildcards (1XX, 2XX, 3XX, 4XX, 5XX),
 * default fallback, and custom three-digit status codes.
 */
type StatusCodePattern =
  // common status codes
  | '200'
  | '201'
  | '202'
  | '204'
  | '301'
  | '302'
  | '304'
  | '400'
  | '401'
  | '403'
  | '404'
  | '409'
  | '500'
  | '502'
  | '503'
  // wildcards for status code classes
  | '1XX'
  | '2XX'
  | '3XX'
  | '4XX'
  | '5XX'
  // default fallback
  | 'default'
  // custom three-digit status codes
  | `${number}${number}${number}`;

/**
 * Schema definition that describes HTTP response structures by status code.
 *
 * Status code patterns:
 * - Exact codes: '200', '404', '500', ...
 * - Ranges: '1XX', '2XX', '3XX', '4XX', '5XX'
 * - Default fallback: 'default'
 *
 * Precedence when multiple keys match:
 * - Exact code > Range > 'default'
 *
 * The response body supports two formats:
 * - Simple body: convenient format for application/json responses
 * - Content body: flexible format for any content type
 *
 * @template Provider - Unique symbol identifying the schema provider
 * @template Headers - Schema for HTTP headers
 * @template Body - Schema for simple response body
 * @template BodyMapping - Record mapping media types to schema definitions
 *
 * @example
 * ```typescript
 * // Simple body: Direct schema
 * {
 *   '200': userSchema,
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Simple body: With description and examples
 * {
 *   '200': {
 *     description: 'User successfully retrieved',
 *     schema: userSchema,
 *     examples: {
 *       standard: { id: 1, name: 'Alice', email: 'alice@example.com' }
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Content body: Flexible format for any content type
 * {
 *   '200': {
 *     description: 'User data in multiple formats',
 *     headers: headersSchema,
 *     content: {
 *       'application/json': {
 *         schema: userSchema,
 *         examples: {
 *           sample: { id: 1, name: 'Alice' }
 *         }
 *       },
 *       'application/xml': xmlUserSchema
 *     }
 *   },
 *   '404': {
 *     description: 'Not Found',
 *     content: {
 *       'application/json': notFoundSchema
 *     }
 *   }
 * }
 * ```
 */
export type KoriResponseSchema<
  Provider extends symbol,
  Headers extends KoriSchemaFor<Provider> = never,
  Body extends KoriSchemaFor<Provider> = never,
  BodyMapping extends Record<string, KoriResponseSchemaBodyItem<KoriSchemaFor<Provider>>> = never,
> = Partial<
  Record<StatusCodePattern, KoriResponseSchemaSimpleBody<Headers, Body> | KoriResponseSchemaBody<Headers, BodyMapping>>
>;

/**
 * Default response schema type accepting any provider and schema definitions.
 */
export type KoriResponseSchemaDefault = KoriResponseSchema<
  symbol,
  KoriSchemaDefault,
  KoriSchemaDefault,
  KoriResponseSchemaBodyMappingDefault
>;
