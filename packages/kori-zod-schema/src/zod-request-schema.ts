import {
  type KoriRequestSchema,
  type KoriRequestSchemaStructure,
  type KoriRequestSchemaContent,
  type KoriRequestSchemaBody,
} from 'kori';
import { type z } from 'zod';

import { type KoriZodSchema, type KoriZodSchemaProvider, createKoriZodSchema } from './zod-schema.js';

export type KoriZodRequestSchema<
  Params extends KoriZodSchema<z.ZodType> = never,
  Headers extends KoriZodSchema<z.ZodType> = never,
  Queries extends KoriZodSchema<z.ZodType> = never,
  Body extends KoriZodSchema<z.ZodType> = never,
> = KoriRequestSchema<KoriZodSchemaProvider, Params, Headers, Queries, Body>;

export type KoriZodRequestParts = KoriRequestSchemaStructure<
  KoriZodSchema<z.ZodType>,
  KoriZodSchema<z.ZodType>,
  KoriZodSchema<z.ZodType>,
  KoriZodSchema<z.ZodType>
>;

export type KoriZodRequestBodySchema =
  | KoriZodSchema<z.ZodType>
  | KoriRequestSchemaContent<KoriZodSchema<z.ZodType>>
  | KoriRequestSchemaBody<KoriZodSchema<z.ZodType>>;

// Convert raw zod schema to wrapped schema type
type ToKoriZodSchema<T extends z.ZodType> = KoriZodSchema<T>;

// Main zodRequest function with proper type inference
export function zodRequest<
  TParams extends z.ZodType | undefined = undefined,
  THeaders extends z.ZodType | undefined = undefined,
  TQueries extends z.ZodType | undefined = undefined,
  TBody extends z.ZodType | undefined = undefined,
>(input: {
  params?: TParams;
  headers?: THeaders;
  queries?: TQueries;
  body?: TBody;
}): KoriZodRequestSchema<
  TParams extends z.ZodType ? ToKoriZodSchema<TParams> : never,
  THeaders extends z.ZodType ? ToKoriZodSchema<THeaders> : never,
  TQueries extends z.ZodType ? ToKoriZodSchema<TQueries> : never,
  TBody extends z.ZodType ? ToKoriZodSchema<TBody> : never
> {
  const result: Record<string, KoriZodSchema<z.ZodType>> = {};

  if (input.params) {
    result.params = createKoriZodSchema(input.params);
  }

  if (input.headers) {
    result.headers = createKoriZodSchema(input.headers);
  }

  if (input.queries) {
    result.queries = createKoriZodSchema(input.queries);
  }

  if (input.body) {
    result.body = createKoriZodSchema(input.body);
  }

  return result;
}
