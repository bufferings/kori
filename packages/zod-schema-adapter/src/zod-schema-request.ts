import {
  createKoriRequestSchema,
  type KoriRequestSchema,
  type KoriRequestSchemaContentBody,
  type KoriRequestSchemaContentBodyItem,
} from '@korix/kori';
import { type z } from 'zod';

import {
  type KoriZodSchema,
  type KoriZodSchemaBase,
  type KoriZodSchemaProvider,
  ZOD_SCHEMA_PROVIDER,
  createKoriZodSchema,
} from './zod-schema.js';

export type KoriZodSchemaRequest<
  Params extends KoriZodSchemaBase = never,
  Headers extends KoriZodSchemaBase = never,
  Queries extends KoriZodSchemaBase = never,
  Body extends KoriZodSchemaBase = never,
  BodyMapping extends Record<string, KoriRequestSchemaContentBodyItem<KoriZodSchemaBase>> = never,
> = KoriRequestSchema<KoriZodSchemaProvider, Params, Headers, Queries, Body, BodyMapping>;

type ZodRequestSchemaSimpleBody<Z extends z.ZodType> =
  | Z
  | {
      description?: string;
      schema: Z;
      examples?: Record<string, unknown>;
    };

type ZodRequestSchemaContentBodyItem<Z extends z.ZodType> =
  | Z
  | {
      schema: Z;
      examples?: Record<string, unknown>;
    };

type ZodRequestSchemaContentBodyItemBase = ZodRequestSchemaContentBodyItem<z.ZodType>;

type ZodRequestSchemaContentBodyMappingBase = Record<string, ZodRequestSchemaContentBodyItemBase>;

type ZodRequestSchemaContentBody<ZBodyMapping extends ZodRequestSchemaContentBodyMappingBase> = {
  description?: string;
  content: ZBodyMapping;
};

type ZBodyItemToBodyItem<Item extends ZodRequestSchemaContentBodyItemBase> = Item extends z.ZodType
  ? KoriZodSchema<Item>
  : Item extends { schema: infer S; examples?: infer X }
    ? S extends z.ZodType
      ? { schema: KoriZodSchema<S>; examples?: X }
      : never
    : never;

type ZBodyMappingToBodyMapping<M extends ZodRequestSchemaContentBodyMappingBase> = {
  [K in keyof M]: ZBodyItemToBodyItem<M[K]>;
};

function isZodType(value: unknown): value is z.ZodType {
  return !!value && typeof value === 'object' && 'safeParse' in (value as Record<string, unknown>);
}

function mapZodBodyMapping<M extends Record<string, ZodRequestSchemaContentBodyItem<z.ZodType>>>(
  m: M,
): ZBodyMappingToBodyMapping<M> {
  const out: Record<string, KoriRequestSchemaContentBodyItem<KoriZodSchema<z.ZodType>>> = {};
  for (const [mt, item] of Object.entries(m)) {
    if (isZodType(item)) {
      out[mt] = createKoriZodSchema(item);
    } else {
      out[mt] = { schema: createKoriZodSchema(item.schema), examples: item.examples };
    }
  }
  return out as ZBodyMappingToBodyMapping<M>;
}

// Overload 1: single zod types
export function zodSchemaRequest<
  ZParams extends z.ZodType = never,
  ZHeaders extends z.ZodType = never,
  ZQueries extends z.ZodType = never,
  ZBody extends z.ZodType = never,
>(options: {
  params?: ZParams;
  headers?: ZHeaders;
  queries?: ZQueries;
  body?: ZodRequestSchemaSimpleBody<ZBody>;
}): KoriZodSchemaRequest<
  KoriZodSchema<ZParams>,
  KoriZodSchema<ZHeaders>,
  KoriZodSchema<ZQueries>,
  KoriZodSchema<ZBody>
>;

// Overload 2: content map or body spec using zod types
export function zodSchemaRequest<
  ZParams extends z.ZodType = never,
  ZHeaders extends z.ZodType = never,
  ZQueries extends z.ZodType = never,
  ZBodyMapping extends ZodRequestSchemaContentBodyMappingBase = never,
>(options: {
  params?: ZParams;
  headers?: ZHeaders;
  queries?: ZQueries;
  body?: ZodRequestSchemaContentBody<ZBodyMapping>;
}): KoriZodSchemaRequest<
  KoriZodSchema<ZParams>,
  KoriZodSchema<ZHeaders>,
  KoriZodSchema<ZQueries>,
  never,
  ZBodyMappingToBodyMapping<ZBodyMapping>
>;

// Impl
export function zodSchemaRequest<
  ZParams extends z.ZodType = never,
  ZHeaders extends z.ZodType = never,
  ZQueries extends z.ZodType = never,
  ZBody extends z.ZodType = never,
  ZBodyMapping extends ZodRequestSchemaContentBodyMappingBase = never,
>(options: {
  params?: ZParams;
  headers?: ZHeaders;
  queries?: ZQueries;
  body?: ZodRequestSchemaSimpleBody<ZBody> | ZodRequestSchemaContentBody<ZBodyMapping>;
}): KoriZodSchemaRequest<
  KoriZodSchema<ZParams>,
  KoriZodSchema<ZHeaders>,
  KoriZodSchema<ZQueries>,
  KoriZodSchema<ZBody>,
  ZBodyMappingToBodyMapping<ZBodyMapping>
> {
  const params = options.params ? createKoriZodSchema(options.params) : undefined;
  const headers = options.headers ? createKoriZodSchema(options.headers) : undefined;
  const queries = options.queries ? createKoriZodSchema(options.queries) : undefined;

  let simpleBody:
    | KoriZodSchema<ZBody>
    | { description?: string; schema: KoriZodSchema<ZBody>; examples?: Record<string, unknown> }
    | undefined;

  let contentBody: KoriRequestSchemaContentBody<ZBodyMappingToBodyMapping<ZBodyMapping>> | undefined;

  if (options.body) {
    if (isZodType(options.body)) {
      // simple body
      simpleBody = createKoriZodSchema(options.body);
    } else if (!('content' in options.body)) {
      simpleBody = {
        description: options.body.description,
        schema: createKoriZodSchema(options.body.schema),
        examples: options.body.examples,
      };
    } else {
      // content body
      contentBody = {
        description: options.body.description,
        content: mapZodBodyMapping(options.body.content),
      };
    }
  }

  if (contentBody) {
    return createKoriRequestSchema({
      provider: ZOD_SCHEMA_PROVIDER,
      params,
      headers,
      queries,
      body: contentBody,
    });
  } else {
    return createKoriRequestSchema({
      provider: ZOD_SCHEMA_PROVIDER,
      params,
      headers,
      queries,
      body: simpleBody,
    });
  }
}
