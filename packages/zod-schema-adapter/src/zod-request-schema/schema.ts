import { createKoriRequestSchema, type KoriRequestSchema, type KoriRequestSchemaContentBodyItem } from '@korix/kori';
import { type z } from 'zod';

import { isZodType } from '../util/index.js';
import {
  type KoriZodSchema,
  type KoriZodSchemaBase,
  type KoriZodSchemaProvider,
  ZOD_SCHEMA_PROVIDER,
  createKoriZodSchema,
} from '../zod-schema/index.js';

import {
  type KoriZodRequestSchemaContentBody,
  type KoriZodRequestSchemaContentBodyMappingBase,
} from './body-content.js';
import { type KoriZodRequestSchemaSimpleBody } from './body-simple.js';
import { toKoriBodyMapping, type KoriRequestSchemaZodToBodyMapping } from './body-transformer.js';

/**
 * Request schema type definition for Zod-based validation.
 * Represents the shape of a request schema that uses Zod schemas
 * for URL parameters, headers, query strings, and request body.
 *
 * @template Params - Zod schema for URL path parameters
 * @template Headers - Zod schema for HTTP headers
 * @template Queries - Zod schema for query string parameters
 * @template Body - Zod schema for simple request body
 * @template BodyMapping - Content-type mapping for complex request body
 */
export type KoriZodRequestSchema<
  Params extends KoriZodSchemaBase = never,
  Headers extends KoriZodSchemaBase = never,
  Queries extends KoriZodSchemaBase = never,
  Body extends KoriZodSchemaBase = never,
  BodyMapping extends Record<string, KoriRequestSchemaContentBodyItem<KoriZodSchemaBase>> = never,
> = KoriRequestSchema<KoriZodSchemaProvider, Params, Headers, Queries, Body, BodyMapping>;

/**
 * Creates a request schema with Zod validation for simple body types.
 * Use this overload when your request body uses a single content type.
 *
 * @template ZParams - Zod type for URL path parameters
 * @template ZHeaders - Zod type for HTTP headers
 * @template ZQueries - Zod type for query string parameters
 * @template ZBody - Zod type for request body
 * @param options.params - Zod schema for validating URL parameters
 * @param options.headers - Zod schema for validating HTTP headers
 * @param options.queries - Zod schema for validating query parameters
 * @param options.body - Zod schema or configuration for request body
 * @returns Request schema with Zod validation
 *
 * @example
 * ```typescript
 * const schema = zodSchemaRequest({
 *   params: z.object({ id: z.string() }),
 *   queries: z.object({ limit: z.coerce.number().optional() }),
 *   body: z.object({ name: z.string() })
 * });
 * ```
 */
export function zodRequestSchema<
  ZParams extends z.ZodType = never,
  ZHeaders extends z.ZodType = never,
  ZQueries extends z.ZodType = never,
  ZBody extends z.ZodType = never,
>(options: {
  params?: ZParams;
  headers?: ZHeaders;
  queries?: ZQueries;
  body?: KoriZodRequestSchemaSimpleBody<ZBody>;
}): KoriZodRequestSchema<
  KoriZodSchema<ZParams>,
  KoriZodSchema<ZHeaders>,
  KoriZodSchema<ZQueries>,
  KoriZodSchema<ZBody>
>;

/**
 * Creates a request schema with Zod validation for content-type mapped bodies.
 * Use this overload when your request body supports multiple content types
 * with different schemas for each.
 *
 * @template ZParams - Zod type for URL path parameters
 * @template ZHeaders - Zod type for HTTP headers
 * @template ZQueries - Zod type for query string parameters
 * @template ZBodyMapping - Content-type to Zod schema mapping
 * @param options.params - Zod schema for validating URL parameters
 * @param options.headers - Zod schema for validating HTTP headers
 * @param options.queries - Zod schema for validating query parameters
 * @param options.body - Content-type mapping with different schemas
 * @returns Request schema with Zod validation
 *
 * @example
 * ```typescript
 * const schema = zodRequestSchema({
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
export function zodRequestSchema<
  ZParams extends z.ZodType = never,
  ZHeaders extends z.ZodType = never,
  ZQueries extends z.ZodType = never,
  ZBodyMapping extends KoriZodRequestSchemaContentBodyMappingBase = never,
>(options: {
  params?: ZParams;
  headers?: ZHeaders;
  queries?: ZQueries;
  body?: KoriZodRequestSchemaContentBody<ZBodyMapping>;
}): KoriZodRequestSchema<
  KoriZodSchema<ZParams>,
  KoriZodSchema<ZHeaders>,
  KoriZodSchema<ZQueries>,
  never,
  KoriRequestSchemaZodToBodyMapping<ZBodyMapping>
>;

export function zodRequestSchema<
  ZParams extends z.ZodType = never,
  ZHeaders extends z.ZodType = never,
  ZQueries extends z.ZodType = never,
  ZBody extends z.ZodType = never,
  ZBodyMapping extends KoriZodRequestSchemaContentBodyMappingBase = never,
>(options: {
  params?: ZParams;
  headers?: ZHeaders;
  queries?: ZQueries;
  body?: KoriZodRequestSchemaSimpleBody<ZBody> | KoriZodRequestSchemaContentBody<ZBodyMapping>;
}): KoriZodRequestSchema<
  KoriZodSchema<ZParams>,
  KoriZodSchema<ZHeaders>,
  KoriZodSchema<ZQueries>,
  KoriZodSchema<ZBody>,
  KoriRequestSchemaZodToBodyMapping<ZBodyMapping>
> {
  const params = options.params ? createKoriZodSchema(options.params) : undefined;
  const headers = options.headers ? createKoriZodSchema(options.headers) : undefined;
  const queries = options.queries ? createKoriZodSchema(options.queries) : undefined;

  if (!options.body) {
    return createKoriRequestSchema({
      provider: ZOD_SCHEMA_PROVIDER,
      params,
      headers,
      queries,
    });
  }

  if ('content' in options.body) {
    // content body
    return createKoriRequestSchema({
      provider: ZOD_SCHEMA_PROVIDER,
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

  if (isZodType(options.body)) {
    return createKoriRequestSchema({
      provider: ZOD_SCHEMA_PROVIDER,
      params,
      headers,
      queries,
      body: createKoriZodSchema(options.body),
    });
  }

  return createKoriRequestSchema({
    provider: ZOD_SCHEMA_PROVIDER,
    params,
    headers,
    queries,
    body: {
      description: options.body.description,
      schema: createKoriZodSchema(options.body.schema),
      examples: options.body.examples,
    },
  });
}
