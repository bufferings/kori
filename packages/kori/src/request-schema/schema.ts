import { type KoriSchemaBase, type KoriSchemaOf } from '../schema/index.js';

import {
  type KoriRequestSchemaContentBody,
  type KoriRequestSchemaContentBodyItem,
  type KoriRequestSchemaContentBodyMappingBase,
} from './body-content.js';
import { type KoriRequestSchemaSimpleBody } from './body-simple.js';

/**
 * Schema definition that describes the structure of an HTTP request.
 *
 * Contains a provider string for runtime type checking and optional schemas
 * for different parts of the HTTP request (params, headers, queries, body).
 *
 * The request body supports two formats:
 * - Simple body: convenient format for application/json content
 * - Content body: flexible format for any content type
 *
 * @template Provider - Unique string identifying the schema provider
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
 *   provider: 'my-schema',
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
 *   provider: 'my-schema',
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
 *   provider: 'my-schema',
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
  Provider extends string,
  Params extends KoriSchemaOf<Provider> = never,
  Headers extends KoriSchemaOf<Provider> = never,
  Queries extends KoriSchemaOf<Provider> = never,
  Body extends KoriSchemaOf<Provider> = never,
  BodyMapping extends Record<string, KoriRequestSchemaContentBodyItem<KoriSchemaOf<Provider>>> = never,
> = {
  koriKind: 'kori-request-schema';
  provider: Provider;
  params?: Params;
  headers?: Headers;
  queries?: Queries;
  body?: KoriRequestSchemaSimpleBody<Body> | KoriRequestSchemaContentBody<BodyMapping>;
};

/**
 * Base request schema type accepting any provider and schema definitions.
 */
export type KoriRequestSchemaBase = KoriRequestSchema<
  string,
  KoriSchemaBase,
  KoriSchemaBase,
  KoriSchemaBase,
  KoriSchemaBase,
  KoriRequestSchemaContentBodyMappingBase
>;

/**
 * Checks whether a value is a Kori request schema.
 *
 * @param value - Value to check
 * @returns True when the value is a Kori request schema
 */
export function isKoriRequestSchema(value: unknown): value is KoriRequestSchemaBase {
  return typeof value === 'object' && value !== null && 'koriKind' in value && value.koriKind === 'kori-request-schema';
}

/**
 * Creates a Kori request schema with provider identification.
 *
 * Enables runtime identification and compile-time type safety for request
 * validation, allowing the framework to verify that validators and schemas
 * use compatible providers.
 *
 * @template Provider - Unique string identifying the schema provider
 * @template Params - Schema for URL path parameters
 * @template Headers - Schema for HTTP headers
 * @template Queries - Schema for query string parameters
 * @template Body - Schema for simple request body
 * @template BodyMapping - Record mapping media types to schema definitions
 *
 * @param options.provider - String that identifies the schema provider
 * @param options.params - Schema for URL path parameters
 * @param options.headers - Schema for HTTP headers
 * @param options.queries - Schema for query string parameters
 * @param options.body - Schema for request body (simple or content-type mapped)
 * @returns Kori request schema ready for type-safe validation
 *
 * @example
 * ```typescript
 * const userRequestSchema = createKoriRequestSchema({
 *   provider: 'my-schema',
 *   params: userParamsSchema,
 *   body: userBodySchema
 * });
 * ```
 */

// Simple Body overload
export function createKoriRequestSchema<
  Provider extends string,
  Params extends KoriSchemaOf<Provider> = never,
  Headers extends KoriSchemaOf<Provider> = never,
  Queries extends KoriSchemaOf<Provider> = never,
  Body extends KoriSchemaOf<Provider> = never,
>(options: {
  provider: Provider;
  params?: Params;
  headers?: Headers;
  queries?: Queries;
  body?: KoriRequestSchemaSimpleBody<Body>;
}): KoriRequestSchema<Provider, Params, Headers, Queries, Body, never>;

// Content Body overload
export function createKoriRequestSchema<
  Provider extends string,
  Params extends KoriSchemaOf<Provider> = never,
  Headers extends KoriSchemaOf<Provider> = never,
  Queries extends KoriSchemaOf<Provider> = never,
  BodyMapping extends Record<string, KoriRequestSchemaContentBodyItem<KoriSchemaOf<Provider>>> = never,
>(options: {
  provider: Provider;
  params?: Params;
  headers?: Headers;
  queries?: Queries;
  body?: KoriRequestSchemaContentBody<BodyMapping>;
}): KoriRequestSchema<Provider, Params, Headers, Queries, never, BodyMapping>;

// Implementation
export function createKoriRequestSchema<
  Provider extends string,
  Params extends KoriSchemaOf<Provider> = never,
  Headers extends KoriSchemaOf<Provider> = never,
  Queries extends KoriSchemaOf<Provider> = never,
  Body extends KoriSchemaOf<Provider> = never,
  BodyMapping extends Record<string, KoriRequestSchemaContentBodyItem<KoriSchemaOf<Provider>>> = never,
>(options: {
  provider: Provider;
  params?: Params;
  headers?: Headers;
  queries?: Queries;
  body?: KoriRequestSchemaSimpleBody<Body> | KoriRequestSchemaContentBody<BodyMapping>;
}): KoriRequestSchema<Provider, Params, Headers, Queries, Body, BodyMapping> {
  const { provider, params, headers, queries, body } = options;
  return {
    koriKind: 'kori-request-schema',
    provider,
    params,
    headers,
    queries,
    body,
  };
}
