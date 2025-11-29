import { type KoriSchemaBase, type KoriSchemaOf } from '../schema/index.js';

import { type KoriRequestSchemaContentBody } from './body-content.js';

/**
 * Phantom property that preserves Body and BodyMapping type parameters through type aliases.
 *
 * Without this property, TypeScript loses track of these type parameters when the schema
 * is wrapped in a type alias, causing inference utilities like InferRequestSchemaBodyOutput
 * to fail. This property is never assigned at runtime and exists only for type checking.
 */
declare const PhantomProperty: unique symbol;

/**
 * Schema definition that describes the structure of an HTTP request.
 *
 * Contains a provider string for runtime type checking and optional schemas
 * for different parts of the HTTP request (params, headers, queries, cookies, body).
 *
 * The request body supports two formats:
 * - Simple body: convenient format for application/json content
 * - Content body: flexible format for any content type
 *
 * @template Provider - Unique string identifying the schema provider
 * @template Params - Schema for URL path parameters
 * @template Headers - Schema for HTTP headers
 * @template Queries - Schema for query string parameters
 * @template Cookies - Schema for HTTP cookies
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
 *   cookies: cookiesSchema,
 *   body: userSchema
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
 *       'application/x-www-form-urlencoded': contactFormSchema
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
  Cookies extends KoriSchemaOf<Provider> = never,
  Body extends KoriSchemaOf<Provider> = never,
  BodyMapping extends Record<string, KoriSchemaOf<Provider>> = never,
> = {
  koriKind: 'kori-request-schema';
  provider: Provider;
  params?: Params;
  headers?: Headers;
  queries?: Queries;
  cookies?: Cookies;
  body?: Body | KoriRequestSchemaContentBody<BodyMapping>;
  [PhantomProperty]?: { body: Body; bodyMapping: BodyMapping };
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
  KoriSchemaBase,
  Record<string, KoriSchemaBase>
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
 * @template Cookies - Schema for HTTP cookies
 * @template Body - Schema for simple request body
 * @template BodyMapping - Record mapping media types to schema definitions
 *
 * @param options.provider - String that identifies the schema provider
 * @param options.params - Schema for URL path parameters
 * @param options.headers - Schema for HTTP headers
 * @param options.queries - Schema for query string parameters
 * @param options.cookies - Schema for HTTP cookies
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
  Cookies extends KoriSchemaOf<Provider> = never,
  Body extends KoriSchemaOf<Provider> = never,
>(options: {
  provider: Provider;
  params?: Params;
  headers?: Headers;
  queries?: Queries;
  cookies?: Cookies;
  body?: Body;
}): KoriRequestSchema<Provider, Params, Headers, Queries, Cookies, Body, never>;

// Content Body overload
export function createKoriRequestSchema<
  Provider extends string,
  Params extends KoriSchemaOf<Provider> = never,
  Headers extends KoriSchemaOf<Provider> = never,
  Queries extends KoriSchemaOf<Provider> = never,
  Cookies extends KoriSchemaOf<Provider> = never,
  BodyMapping extends Record<string, KoriSchemaOf<Provider>> = never,
>(options: {
  provider: Provider;
  params?: Params;
  headers?: Headers;
  queries?: Queries;
  cookies?: Cookies;
  body?: KoriRequestSchemaContentBody<BodyMapping>;
}): KoriRequestSchema<Provider, Params, Headers, Queries, Cookies, never, BodyMapping>;

// Implementation
export function createKoriRequestSchema<
  Provider extends string,
  Params extends KoriSchemaOf<Provider> = never,
  Headers extends KoriSchemaOf<Provider> = never,
  Queries extends KoriSchemaOf<Provider> = never,
  Cookies extends KoriSchemaOf<Provider> = never,
  Body extends KoriSchemaOf<Provider> = never,
  BodyMapping extends Record<string, KoriSchemaOf<Provider>> = never,
>(options: {
  provider: Provider;
  params?: Params;
  headers?: Headers;
  queries?: Queries;
  cookies?: Cookies;
  body?: Body | KoriRequestSchemaContentBody<BodyMapping>;
}): KoriRequestSchema<Provider, Params, Headers, Queries, Cookies, Body, BodyMapping> {
  const { provider, params, headers, queries, cookies, body } = options;
  return {
    koriKind: 'kori-request-schema',
    provider,
    params,
    headers,
    queries,
    cookies,
    body,
  };
}
