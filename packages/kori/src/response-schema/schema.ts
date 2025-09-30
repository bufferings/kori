import { type KoriSchemaOf } from '../schema/index.js';

import { type KoriResponseSchemaContentEntry } from './entry-content.js';

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
 * @template P Provider string
 */
export type KoriResponseSchemaEntry<P extends string> =
  | KoriSchemaOf<P>
  | KoriResponseSchemaContentEntry<KoriSchemaOf<P>, Record<string, KoriSchemaOf<P>>>;

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
 * @template Provider Unique string identifying the schema provider
 * @template Responses Mapping from status code patterns to response definitions
 *
 * @example
 * ```typescript
 * // Simple body: Direct schema
 * const responseSchema = createKoriResponseSchema({
 *   provider: 'my-schema',
 *   responses: {
 *     '200': userSchema,
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Content body: Flexible format for any content type
 * const responseSchema = createKoriResponseSchema({
 *   provider: 'my-schema',
 *   responses: {
 *     '200': {
 *       description: 'User data in multiple formats',
 *       headers: headersSchema,
 *       content: {
 *         'application/json': userSchema,
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
  Provider extends string,
  Responses extends Partial<Record<KoriResponseSchemaStatusCode, KoriResponseSchemaEntry<Provider>>>,
> = {
  koriKind: 'kori-response-schema';
  provider: Provider;
  responses?: Responses;
};

/**
 * Base response schema type accepting any provider and response entries.
 */
export type KoriResponseSchemaBase = KoriResponseSchema<
  string,
  Partial<Record<KoriResponseSchemaStatusCode, KoriResponseSchemaEntry<string>>>
>;

/**
 * Checks whether a value is a Kori response schema.
 *
 * @param value - Value to check
 * @returns True when the value is a Kori response schema
 */
export function isKoriResponseSchema(value: unknown): value is KoriResponseSchemaBase {
  return (
    typeof value === 'object' && value !== null && 'koriKind' in value && value.koriKind === 'kori-response-schema'
  );
}

/**
 * Creates a Kori response schema with provider identification.
 *
 * @param options.provider - String that identifies the schema provider
 * @param options.responses - Mapping from status code patterns to response entries
 */
export function createKoriResponseSchema<
  Provider extends string,
  Responses extends Partial<Record<KoriResponseSchemaStatusCode, KoriResponseSchemaEntry<Provider>>> = never,
>(options: { provider: Provider; responses?: Responses }): KoriResponseSchema<Provider, Responses> {
  const { provider, responses } = options;
  return {
    koriKind: 'kori-response-schema',
    provider,
    responses,
  };
}
