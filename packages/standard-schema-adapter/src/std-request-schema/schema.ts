import { createKoriRequestSchema, type KoriRequestSchema } from '@korix/kori';
import { type StandardSchemaV1 } from '@standard-schema/spec';

import {
  type KoriStdSchema,
  type KoriStdSchemaBase,
  type KoriStdSchemaProvider,
  STANDARD_SCHEMA_PROVIDER,
  createKoriStdSchema,
} from '../std-schema/index.js';
import { isStdType } from '../util/index.js';

import { type KoriStdRequestSchemaContentBody } from './body-content.js';
import { toKoriBodyMapping, type KoriRequestSchemaStdToBodyMapping } from './body-transformer.js';

/**
 * Request schema type definition for Standard Schema validation.
 * Represents the shape of a request schema that uses Standard Schema schemas
 * for URL parameters, headers, query strings, cookies, and request body.
 *
 * @template Params - Standard Schema schema for URL path parameters
 * @template Headers - Standard Schema schema for HTTP headers
 * @template Queries - Standard Schema schema for query string parameters
 * @template Cookies - Standard Schema schema for HTTP cookies
 * @template Body - Standard Schema schema for simple request body
 * @template BodyMapping - Content-type mapping for complex request body
 */
export type KoriStdRequestSchema<
  Params extends KoriStdSchemaBase = never,
  Headers extends KoriStdSchemaBase = never,
  Queries extends KoriStdSchemaBase = never,
  Cookies extends KoriStdSchemaBase = never,
  Body extends KoriStdSchemaBase = never,
  BodyMapping extends Record<string, KoriStdSchemaBase> = never,
> = KoriRequestSchema<KoriStdSchemaProvider, Params, Headers, Queries, Cookies, Body, BodyMapping>;

/**
 * Creates a request schema with Standard Schema validation for simple body types.
 * Use this overload when your request body uses a single content type.
 *
 * @template StdParams - Standard Schema type for URL path parameters
 * @template StdHeaders - Standard Schema type for HTTP headers
 * @template StdQueries - Standard Schema type for query string parameters
 * @template StdCookies - Standard Schema type for HTTP cookies
 * @template StdBody - Standard Schema type for request body
 * @param options.params - Standard Schema schema for validating URL parameters
 * @param options.headers - Standard Schema schema for validating HTTP headers
 * @param options.queries - Standard Schema schema for validating query parameters
 * @param options.cookies - Standard Schema schema for validating HTTP cookies
 * @param options.body - Standard Schema schema or configuration for request body
 * @returns Request schema with Standard Schema validation
 *
 * @example
 * ```typescript
 * const schema = stdRequestSchema({
 *   params: z.object({ id: z.string() }),
 *   queries: z.object({ limit: z.coerce.number().optional() }),
 *   body: z.object({ name: z.string() })
 * });
 * ```
 */
export function stdRequestSchema<
  StdParams extends StandardSchemaV1 = never,
  StdHeaders extends StandardSchemaV1 = never,
  StdQueries extends StandardSchemaV1 = never,
  StdCookies extends StandardSchemaV1 = never,
  StdBody extends StandardSchemaV1 = never,
>(options: {
  params?: StdParams;
  headers?: StdHeaders;
  queries?: StdQueries;
  cookies?: StdCookies;
  body?: StdBody;
}): KoriStdRequestSchema<
  KoriStdSchema<StdParams>,
  KoriStdSchema<StdHeaders>,
  KoriStdSchema<StdQueries>,
  KoriStdSchema<StdCookies>,
  KoriStdSchema<StdBody>
>;

/**
 * Creates a request schema with Standard Schema validation for content-type mapped bodies.
 * Use this overload when your request body supports multiple content types
 * with different schemas for each.
 *
 * @template StdParams - Standard Schema type for URL path parameters
 * @template StdHeaders - Standard Schema type for HTTP headers
 * @template StdQueries - Standard Schema type for query string parameters
 * @template StdCookies - Standard Schema type for HTTP cookies
 * @template StdBodyMapping - Content-type to Standard Schema schema mapping
 * @param options.params - Standard Schema schema for validating URL parameters
 * @param options.headers - Standard Schema schema for validating HTTP headers
 * @param options.queries - Standard Schema schema for validating query parameters
 * @param options.cookies - Standard Schema schema for validating HTTP cookies
 * @param options.body - Content-type mapping with different schemas
 * @returns Request schema with Standard Schema validation
 *
 * @example
 * ```typescript
 * const schema = stdRequestSchema({
 *   params: z.object({ id: z.string() }),
 *   body: {
 *     content: {
 *       'application/json': z.object({ data: z.string() }),
 *       'multipart/form-data': z.object({ file: z.any() })
 *     }
 *   }
 * });
 * ```
 */
export function stdRequestSchema<
  StdParams extends StandardSchemaV1 = never,
  StdHeaders extends StandardSchemaV1 = never,
  StdQueries extends StandardSchemaV1 = never,
  StdCookies extends StandardSchemaV1 = never,
  StdBodyMapping extends Record<string, StandardSchemaV1> = never,
>(options: {
  params?: StdParams;
  headers?: StdHeaders;
  queries?: StdQueries;
  cookies?: StdCookies;
  body?: KoriStdRequestSchemaContentBody<StdBodyMapping>;
}): KoriStdRequestSchema<
  KoriStdSchema<StdParams>,
  KoriStdSchema<StdHeaders>,
  KoriStdSchema<StdQueries>,
  KoriStdSchema<StdCookies>,
  never,
  KoriRequestSchemaStdToBodyMapping<StdBodyMapping>
>;

export function stdRequestSchema<
  StdParams extends StandardSchemaV1 = never,
  StdHeaders extends StandardSchemaV1 = never,
  StdQueries extends StandardSchemaV1 = never,
  StdCookies extends StandardSchemaV1 = never,
  StdBody extends StandardSchemaV1 = never,
  StdBodyMapping extends Record<string, StandardSchemaV1> = never,
>(options: {
  params?: StdParams;
  headers?: StdHeaders;
  queries?: StdQueries;
  cookies?: StdCookies;
  body?: StdBody | KoriStdRequestSchemaContentBody<StdBodyMapping>;
}): KoriStdRequestSchema<
  KoriStdSchema<StdParams>,
  KoriStdSchema<StdHeaders>,
  KoriStdSchema<StdQueries>,
  KoriStdSchema<StdCookies>,
  KoriStdSchema<StdBody>,
  KoriRequestSchemaStdToBodyMapping<StdBodyMapping>
> {
  const params = options.params ? createKoriStdSchema(options.params) : undefined;
  const headers = options.headers ? createKoriStdSchema(options.headers) : undefined;
  const queries = options.queries ? createKoriStdSchema(options.queries) : undefined;
  const cookies = options.cookies ? createKoriStdSchema(options.cookies) : undefined;

  if (!options.body) {
    return createKoriRequestSchema({
      provider: STANDARD_SCHEMA_PROVIDER,
      params,
      headers,
      queries,
      cookies,
    });
  }

  // simple body
  if (isStdType(options.body)) {
    return createKoriRequestSchema({
      provider: STANDARD_SCHEMA_PROVIDER,
      params,
      headers,
      queries,
      cookies,
      body: createKoriStdSchema(options.body),
    });
  }

  // content body
  return createKoriRequestSchema({
    provider: STANDARD_SCHEMA_PROVIDER,
    params,
    headers,
    queries,
    cookies,
    body: {
      description: options.body.description,
      content: toKoriBodyMapping(options.body.content),
    },
  });
}
