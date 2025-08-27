import { type KoriSchemaFor } from '../schema/index.js';

import { type KoriResponseSchemaContentEntry, type KoriResponseSchemaContentEntryItem } from './entry-content.js';
import { type KoriResponseSchemaSimpleEntry } from './entry-simple.js';

const ProviderKey = Symbol('response-schema-provider');

/**
 * HTTP status code patterns for response schema keys.
 */
export type KoriResponseSchemaStatusCode =
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
 * Union of response entry types for a specific provider.
 *
 * Represents a single response definition that can be either a simple body format
 * (convenient for application/json) or a content body format (flexible for any content type).
 *
 * @template P Provider symbol
 */
export type KoriResponseSchemaEntry<P extends symbol> =
  | KoriResponseSchemaSimpleEntry<KoriSchemaFor<P>, KoriSchemaFor<P>>
  | KoriResponseSchemaContentEntry<
      KoriSchemaFor<P>,
      Record<string, KoriResponseSchemaContentEntryItem<KoriSchemaFor<P>>>
    >;

/**
 * Schema definition that describes HTTP response structures by status code.
 *
 * Status code patterns:
 * - Specific codes: '200', '404', '500', etc.
 * - Class wildcards: '2XX', '4XX', '5XX' (matches any code in that class)
 * - Default fallback: 'default' (matches any unspecified status code)
 * - Custom codes: Any three-digit string pattern
 *
 * Precedence when multiple keys match:
 * - Specific code > Class wildcard > 'default'
 *
 * The response body supports two formats:
 * - Simple body: convenient format for application/json responses
 * - Content body: flexible format for any content type
 *
 * @template Provider Unique symbol identifying the schema provider
 * @template Responses Mapping from status code patterns to response definitions
 *
 * @example
 * ```typescript
 * // Simple body: Direct schema
 * const responseSchema = createKoriResponseSchema({
 *   provider: MySchemaProvider,
 *   responses: {
 *     '200': userSchema,
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Simple body: With description and examples
 * const responseSchema = createKoriResponseSchema({
 *   provider: MySchemaProvider,
 *   responses: {
 *     '200': {
 *       description: 'User successfully retrieved',
 *       schema: userSchema,
 *       examples: {
 *         standard: { id: 1, name: 'Alice', email: 'alice@example.com' }
 *       }
 *     }
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Content body: Flexible format for any content type
 * const responseSchema = createKoriResponseSchema({
 *   provider: MySchemaProvider,
 *   responses: {
 *     '200': {
 *       description: 'User data in multiple formats',
 *       headers: headersSchema,
 *       content: {
 *         'application/json': {
 *           schema: userSchema,
 *           examples: {
 *             sample: { id: 1, name: 'Alice' }
 *           }
 *         },
 *         'application/xml': xmlUserSchema
 *       }
 *     },
 *     '404': {
 *       description: 'Not Found',
 *       content: {
 *         'application/json': notFoundSchema
 *       }
 *     }
 *   }
 * });
 * ```
 */
export type KoriResponseSchema<
  Provider extends symbol,
  Responses extends Partial<Record<KoriResponseSchemaStatusCode, KoriResponseSchemaEntry<Provider>>>,
> = {
  [ProviderKey]: Provider;
  responses: Responses;
};

/**
 * Default response schema type accepting any provider and response entries.
 */
export type KoriResponseSchemaDefault = KoriResponseSchema<
  symbol,
  Partial<Record<KoriResponseSchemaStatusCode, KoriResponseSchemaEntry<symbol>>>
>;

/**
 * Checks whether a value is a Kori response schema.
 *
 * @param value - Value to check
 * @returns True when the value is a Kori response schema
 */
export function isKoriResponseSchema(value: unknown): value is KoriResponseSchemaDefault {
  return typeof value === 'object' && value !== null && ProviderKey in value;
}

/**
 * Gets the provider symbol from a Kori response schema.
 *
 * @param schema - Kori response schema to read the provider from
 * @returns Provider symbol associated with the schema
 */
export function getKoriResponseSchemaProvider<S extends KoriResponseSchemaDefault>(schema: S): S[typeof ProviderKey] {
  return schema[ProviderKey];
}

/**
 * Creates a Kori response schema with provider identification.
 *
 * @param options - Response schema configuration
 * @param options.provider - Symbol that identifies the schema provider
 * @param options.responses - Mapping from status code patterns to response entries
 */
export function createKoriResponseSchema<
  Provider extends symbol,
  Responses extends Partial<Record<KoriResponseSchemaStatusCode, KoriResponseSchemaEntry<Provider>>>,
>(options: { provider: Provider; responses: Responses }): KoriResponseSchema<Provider, Responses> {
  const { provider, responses } = options;
  return {
    [ProviderKey]: provider,
    responses,
  };
}
