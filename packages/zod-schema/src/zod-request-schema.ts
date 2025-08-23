import {
  type KoriRequestSchema,
  type KoriRequestSchemaBody,
  type KoriRequestSchemaBodyItem,
  type KoriRequestSchemaSimpleBody,
} from '@korix/kori';
import { type z } from 'zod';

import { type KoriZodSchema, type KoriZodSchemaProvider, createKoriZodSchema } from './zod-schema.js';

export type KoriZodRequestSchema<
  Params extends KoriZodSchema<z.ZodType> = never,
  Headers extends KoriZodSchema<z.ZodType> = never,
  Queries extends KoriZodSchema<z.ZodType> = never,
  Body extends KoriZodSchema<z.ZodType> = never,
  BodyMapping extends Record<string, KoriRequestSchemaBodyItem<KoriZodSchema<z.ZodType>>> = never,
> = KoriRequestSchema<KoriZodSchemaProvider, Params, Headers, Queries, Body, BodyMapping>;

export type KoriZodRequestBodySchema =
  | KoriZodSchema<z.ZodType>
  | KoriRequestSchemaSimpleBody<KoriZodSchema<z.ZodType>>
  | KoriRequestSchemaBody<Record<string, KoriRequestSchemaBodyItem<KoriZodSchema<z.ZodType>>>>;

type ToKoriZodSchema<T extends z.ZodType> = KoriZodSchema<T>;

// Additional helpers for content map/spec support
type ZodContentEntry = z.ZodType | { schema: z.ZodType; examples?: Record<string, unknown> };
type ZodContentMap = Record<string | number | symbol, ZodContentEntry>;
type ZodBodySpec<C extends ZodContentMap = ZodContentMap> = { description?: string; required?: boolean; content: C };

type ToKoriBodyItem<E> = E extends z.ZodType
  ? KoriRequestSchemaBodyItem<KoriZodSchema<E>>
  : E extends { schema: infer S }
    ? S extends z.ZodType
      ? KoriRequestSchemaBodyItem<KoriZodSchema<S>>
      : never
    : never;

type ToKoriContent<C extends ZodContentMap> = { [K in keyof C]: ToKoriBodyItem<C[K]> };

function isZodType(value: unknown): value is z.ZodType {
  return !!value && typeof value === 'object' && 'safeParse' in (value as Record<string, unknown>);
}

function toKoriZodContent<C extends ZodContentMap>(content: C): ToKoriContent<C> {
  const out: Record<string, KoriRequestSchemaBodyItem<KoriZodSchema<z.ZodType>>> = {};
  for (const [mediaType, entry] of Object.entries(content)) {
    if (isZodType(entry)) {
      out[mediaType] = createKoriZodSchema(entry);
    } else {
      out[mediaType] = { schema: createKoriZodSchema(entry.schema), examples: entry.examples };
    }
  }
  return out as unknown as ToKoriContent<C>;
}

// Overload 1: single zod types
export function zodRequestSchema<
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
>;

// Overload 2: content map or body spec using zod types
export function zodRequestSchema<C extends ZodContentMap | ZodBodySpec>(input: {
  params?: z.ZodType;
  headers?: z.ZodType;
  queries?: z.ZodType;
  body?: C;
}): KoriZodRequestSchema<
  never,
  never,
  never,
  never,
  C extends ZodBodySpec<infer CC> ? ToKoriContent<CC> : C extends ZodContentMap ? ToKoriContent<C> : never
>;

// Impl
export function zodRequestSchema<C extends ZodContentMap | ZodBodySpec>(input: {
  params?: z.ZodType;
  headers?: z.ZodType;
  queries?: z.ZodType;
  body?: z.ZodType | C;
}): KoriZodRequestSchema {
  const result: Record<string, unknown> = {};

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
    if (isZodType(input.body)) {
      result.body = createKoriZodSchema(input.body);
    } else if ('content' in input.body) {
      const body = input.body as ZodBodySpec;
      result.body = {
        description: body.description,
        content: toKoriZodContent(body.content),
      } as unknown as KoriRequestSchemaBody<ToKoriContent<typeof body.content>>;
    } else {
      result.body = toKoriZodContent(input.body);
    }
  }

  return result as KoriZodRequestSchema;
}
