import { type KoriSchemaDefault, type KoriSchemaFor } from '../schema/index.js';

import {
  type KoriRequestSchemaContentBody,
  type KoriRequestSchemaContentBodyItem,
  type KoriRequestSchemaContentBodyMappingDefault,
} from './body-content.js';
import { type KoriRequestSchemaSimpleBody } from './body-simple.js';

const ProviderKey = Symbol('request-schema-provider');

/**
 * Schema definition that describes the structure of an HTTP request.
 *
 * Contains a provider symbol for runtime type checking and optional schemas
 * for different parts of the HTTP request (params, headers, queries, body).
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
 * const requestSchema = createKoriRequestSchema({
 *   provider: MySchemaProvider,
 *   params: paramsSchema,
 *   headers: headersSchema,
 *   queries: queriesSchema,
 *   body: userSchema
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Simple body: With description and examples
 * const requestSchema = createKoriRequestSchema({
 *   provider: MySchemaProvider,
 *   params: paramsSchema,
 *   body: {
 *     description: 'User registration data',
 *     schema: userSchema,
 *     examples: {
 *       sample: { name: 'Alice', email: 'alice@example.com' }
 *     }
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Content body: Flexible format for any content type
 * const requestSchema = createKoriRequestSchema({
 *   provider: MySchemaProvider,
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
 * });
 * ```
 */
export type KoriRequestSchema<
  Provider extends symbol,
  Params extends KoriSchemaFor<Provider> = never,
  Headers extends KoriSchemaFor<Provider> = never,
  Queries extends KoriSchemaFor<Provider> = never,
  Body extends KoriSchemaFor<Provider> = never,
  BodyMapping extends Record<string, KoriRequestSchemaContentBodyItem<KoriSchemaFor<Provider>>> = never,
> = {
  [ProviderKey]: Provider;
  params?: Params;
  headers?: Headers;
  queries?: Queries;
  body?: KoriRequestSchemaSimpleBody<Body> | KoriRequestSchemaContentBody<BodyMapping>;
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
  KoriRequestSchemaContentBodyMappingDefault
>;

/**
 * Checks whether a value is a Kori request schema.
 *
 * @param value - Value to check
 * @returns True when the value is a Kori request schema
 */
export function isKoriRequestSchema(value: unknown): value is KoriRequestSchemaDefault {
  return typeof value === 'object' && value !== null && ProviderKey in value;
}

/**
 * Gets the provider symbol from a Kori request schema.
 *
 * @param schema - Kori request schema to read the provider from
 * @returns Provider symbol associated with the schema
 */
export function getKoriRequestSchemaProvider<S extends KoriRequestSchemaDefault>(schema: S): S[typeof ProviderKey] {
  return schema[ProviderKey];
}

/**
 * Creates a Kori request schema with provider identification.
 *
 * Enables runtime identification and compile-time type safety for request
 * validation, allowing the framework to verify that validators and schemas
 * use compatible providers.
 *
 * @template Provider - Unique symbol identifying the schema provider
 * @template Params - Schema for URL path parameters
 * @template Headers - Schema for HTTP headers
 * @template Queries - Schema for query string parameters
 * @template Body - Schema for simple request body
 * @template BodyMapping - Record mapping media types to schema definitions
 *
 * @param options - Request schema configuration
 * @param options.provider - Symbol that identifies the schema provider
 * @param options.params - Schema for URL path parameters
 * @param options.headers - Schema for HTTP headers
 * @param options.queries - Schema for query string parameters
 * @param options.body - Schema for request body (simple or content-type mapped)
 * @returns Kori request schema ready for type-safe validation
 *
 * @example
 * ```typescript
 * const userRequestSchema = createKoriRequestSchema({
 *   provider: MySchemaProvider,
 *   params: userParamsSchema,
 *   body: userBodySchema
 * });
 * ```
 */

// Simple Body overload
export function createKoriRequestSchema<
  Provider extends symbol,
  Params extends KoriSchemaFor<Provider> = never,
  Headers extends KoriSchemaFor<Provider> = never,
  Queries extends KoriSchemaFor<Provider> = never,
  Body extends KoriSchemaFor<Provider> = never,
>(options: {
  provider: Provider;
  params?: Params;
  headers?: Headers;
  queries?: Queries;
  body?: KoriRequestSchemaSimpleBody<Body>;
}): KoriRequestSchema<Provider, Params, Headers, Queries, Body, never>;

// Content Body overload
export function createKoriRequestSchema<
  Provider extends symbol,
  Params extends KoriSchemaFor<Provider> = never,
  Headers extends KoriSchemaFor<Provider> = never,
  Queries extends KoriSchemaFor<Provider> = never,
  BodyMapping extends Record<string, KoriRequestSchemaContentBodyItem<KoriSchemaFor<Provider>>> = never,
>(options: {
  provider: Provider;
  params?: Params;
  headers?: Headers;
  queries?: Queries;
  body?: KoriRequestSchemaContentBody<BodyMapping>;
}): KoriRequestSchema<Provider, Params, Headers, Queries, never, BodyMapping>;

// Implementation
export function createKoriRequestSchema<
  Provider extends symbol,
  Params extends KoriSchemaFor<Provider> = never,
  Headers extends KoriSchemaFor<Provider> = never,
  Queries extends KoriSchemaFor<Provider> = never,
  Body extends KoriSchemaFor<Provider> = never,
  BodyMapping extends Record<string, KoriRequestSchemaContentBodyItem<KoriSchemaFor<Provider>>> = never,
>(options: {
  provider: Provider;
  params?: Params;
  headers?: Headers;
  queries?: Queries;
  body?: KoriRequestSchemaSimpleBody<Body> | KoriRequestSchemaContentBody<BodyMapping>;
}): KoriRequestSchema<Provider, Params, Headers, Queries, Body, BodyMapping> {
  const { provider, params, headers, queries, body } = options;
  return {
    [ProviderKey]: provider,
    params,
    headers,
    queries,
    body,
  };
}
