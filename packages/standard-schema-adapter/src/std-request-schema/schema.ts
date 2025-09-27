import { createKoriRequestSchema, type KoriRequestSchema, type KoriRequestSchemaContentBodyItem } from '@korix/kori';
import { type StandardSchemaV1 } from '@standard-schema/spec';

import {
  type KoriStdSchema,
  type KoriStdSchemaBase,
  type KoriStdSchemaProvider,
  STANDARD_SCHEMA_PROVIDER,
  createKoriStdSchema,
} from '../std-schema/index.js';
import { isStdType } from '../util/index.js';

import {
  type KoriStdRequestSchemaContentBody,
  type KoriStdRequestSchemaContentBodyMappingBase,
} from './body-content.js';
import { type KoriStdRequestSchemaSimpleBody } from './body-simple.js';
import { toKoriBodyMapping, type KoriRequestSchemaStdToBodyMapping } from './body-transformer.js';

/**
 * Request schema type definition for Standard Schema validation.
 * Represents the shape of a request schema that uses Standard Schema schemas
 * for URL parameters, headers, query strings, and request body.
 *
 * @template Params - Standard Schema schema for URL path parameters
 * @template Headers - Standard Schema schema for HTTP headers
 * @template Queries - Standard Schema schema for query string parameters
 * @template Body - Standard Schema schema for simple request body
 * @template BodyMapping - Content-type mapping for complex request body
 */
export type KoriStdRequestSchema<
  Params extends KoriStdSchemaBase = never,
  Headers extends KoriStdSchemaBase = never,
  Queries extends KoriStdSchemaBase = never,
  Body extends KoriStdSchemaBase = never,
  BodyMapping extends Record<string, KoriRequestSchemaContentBodyItem<KoriStdSchemaBase>> = never,
> = KoriRequestSchema<KoriStdSchemaProvider, Params, Headers, Queries, Body, BodyMapping>;

/**
 * Creates a request schema with Standard Schema validation for simple body types.
 * Use this overload when your request body uses a single content type.
 *
 * @template StdParams - Standard Schema type for URL path parameters
 * @template StdHeaders - Standard Schema type for HTTP headers
 * @template StdQueries - Standard Schema type for query string parameters
 * @template StdBody - Standard Schema type for request body
 * @param options.params - Standard Schema schema for validating URL parameters
 * @param options.headers - Standard Schema schema for validating HTTP headers
 * @param options.queries - Standard Schema schema for validating query parameters
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
  StdBody extends StandardSchemaV1 = never,
>(options: {
  params?: StdParams;
  headers?: StdHeaders;
  queries?: StdQueries;
  body?: KoriStdRequestSchemaSimpleBody<StdBody>;
}): KoriStdRequestSchema<
  KoriStdSchema<StdParams>,
  KoriStdSchema<StdHeaders>,
  KoriStdSchema<StdQueries>,
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
 * @template StdBodyMapping - Content-type to Standard Schema schema mapping
 * @param options.params - Standard Schema schema for validating URL parameters
 * @param options.headers - Standard Schema schema for validating HTTP headers
 * @param options.queries - Standard Schema schema for validating query parameters
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
  StdBodyMapping extends KoriStdRequestSchemaContentBodyMappingBase = never,
>(options: {
  params?: StdParams;
  headers?: StdHeaders;
  queries?: StdQueries;
  body?: KoriStdRequestSchemaContentBody<StdBodyMapping>;
}): KoriStdRequestSchema<
  KoriStdSchema<StdParams>,
  KoriStdSchema<StdHeaders>,
  KoriStdSchema<StdQueries>,
  never,
  KoriRequestSchemaStdToBodyMapping<StdBodyMapping>
>;

export function stdRequestSchema<
  StdParams extends StandardSchemaV1 = never,
  StdHeaders extends StandardSchemaV1 = never,
  StdQueries extends StandardSchemaV1 = never,
  StdBody extends StandardSchemaV1 = never,
  StdBodyMapping extends KoriStdRequestSchemaContentBodyMappingBase = never,
>(options: {
  params?: StdParams;
  headers?: StdHeaders;
  queries?: StdQueries;
  body?: KoriStdRequestSchemaSimpleBody<StdBody> | KoriStdRequestSchemaContentBody<StdBodyMapping>;
}): KoriStdRequestSchema<
  KoriStdSchema<StdParams>,
  KoriStdSchema<StdHeaders>,
  KoriStdSchema<StdQueries>,
  KoriStdSchema<StdBody>,
  KoriRequestSchemaStdToBodyMapping<StdBodyMapping>
> {
  const params = options.params ? createKoriStdSchema(options.params) : undefined;
  const headers = options.headers ? createKoriStdSchema(options.headers) : undefined;
  const queries = options.queries ? createKoriStdSchema(options.queries) : undefined;

  if (!options.body) {
    return createKoriRequestSchema({
      provider: STANDARD_SCHEMA_PROVIDER,
      params,
      headers,
      queries,
    });
  }

  if ('content' in options.body) {
    // content body
    return createKoriRequestSchema({
      provider: STANDARD_SCHEMA_PROVIDER,
      params,
      headers,
      queries,
      body: {
        description: options.body.description,
        content: toKoriBodyMapping(options.body.content),
      },
    });
  }

  // simple body

  if (isStdType(options.body)) {
    return createKoriRequestSchema({
      provider: STANDARD_SCHEMA_PROVIDER,
      params,
      headers,
      queries,
      body: createKoriStdSchema(options.body),
    });
  }

  return createKoriRequestSchema({
    provider: STANDARD_SCHEMA_PROVIDER,
    params,
    headers,
    queries,
    body: {
      description: options.body.description,
      schema: createKoriStdSchema(options.body.schema),
      examples: options.body.examples,
    },
  });
}
