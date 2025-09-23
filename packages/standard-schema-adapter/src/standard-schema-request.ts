import {
  createKoriRequestSchema,
  type KoriRequestSchema,
  type KoriRequestSchemaContentBody,
  type KoriRequestSchemaContentBodyItem,
} from '@korix/kori';
import { type StandardSchemaV1 } from '@standard-schema/spec';

import {
  type KoriStandardSchema,
  type KoriStandardSchemaBase,
  type KoriStandardSchemaProvider,
  STANDARD_SCHEMA_PROVIDER,
  createKoriStandardSchema,
} from './standard-schema.js';

export type KoriStandardSchemaRequest<
  Params extends KoriStandardSchemaBase = never,
  Headers extends KoriStandardSchemaBase = never,
  Queries extends KoriStandardSchemaBase = never,
  Body extends KoriStandardSchemaBase = never,
  BodyMapping extends Record<string, KoriRequestSchemaContentBodyItem<KoriStandardSchemaBase>> = never,
> = KoriRequestSchema<KoriStandardSchemaProvider, Params, Headers, Queries, Body, BodyMapping>;

type StandardSchemaRequestSimpleBody<S extends StandardSchemaV1> =
  | S
  | {
      description?: string;
      schema: S;
      examples?: Record<string, unknown>;
    };

type StandardSchemaRequestContentBodyItem<S extends StandardSchemaV1> =
  | S
  | {
      schema: S;
      examples?: Record<string, unknown>;
    };

type StandardSchemaRequestContentBodyItemBase = StandardSchemaRequestContentBodyItem<StandardSchemaV1>;

type StandardSchemaRequestContentBodyMappingBase = Record<string, StandardSchemaRequestContentBodyItemBase>;

type StandardSchemaRequestContentBody<SBodyMapping extends StandardSchemaRequestContentBodyMappingBase> = {
  description?: string;
  content: SBodyMapping;
};

type StandardSchemaBodyItemToBodyItem<Item extends StandardSchemaRequestContentBodyItemBase> =
  Item extends StandardSchemaV1
    ? KoriStandardSchema<Item>
    : Item extends { schema: infer S; examples?: infer X }
      ? S extends StandardSchemaV1
        ? { schema: KoriStandardSchema<S>; examples?: X }
        : never
      : never;

type StandardSchemaBodyMappingToBodyMapping<M extends StandardSchemaRequestContentBodyMappingBase> = {
  [K in keyof M]: StandardSchemaBodyItemToBodyItem<M[K]>;
};

function isStandardSchema(value: unknown): value is StandardSchemaV1 {
  return !!value && typeof value === 'object' && '~standard' in (value as Record<string, unknown>);
}

function mapStandardSchemaBodyMapping<M extends Record<string, StandardSchemaRequestContentBodyItem<StandardSchemaV1>>>(
  m: M,
): StandardSchemaBodyMappingToBodyMapping<M> {
  const out: Record<string, KoriRequestSchemaContentBodyItem<KoriStandardSchema<StandardSchemaV1>>> = {};
  for (const [mt, item] of Object.entries(m)) {
    if (isStandardSchema(item)) {
      out[mt] = createKoriStandardSchema(item);
    } else {
      out[mt] = { schema: createKoriStandardSchema(item.schema), examples: item.examples };
    }
  }
  return out as StandardSchemaBodyMappingToBodyMapping<M>;
}

// Overload 1: single standard schema types
export function standardSchemaRequest<
  SParams extends StandardSchemaV1 = never,
  SHeaders extends StandardSchemaV1 = never,
  SQueries extends StandardSchemaV1 = never,
  SBody extends StandardSchemaV1 = never,
>(options: {
  params?: SParams;
  headers?: SHeaders;
  queries?: SQueries;
  body?: StandardSchemaRequestSimpleBody<SBody>;
}): KoriStandardSchemaRequest<
  KoriStandardSchema<SParams>,
  KoriStandardSchema<SHeaders>,
  KoriStandardSchema<SQueries>,
  KoriStandardSchema<SBody>
>;

// Overload 2: content map or body spec using standard schema types
export function standardSchemaRequest<
  SParams extends StandardSchemaV1 = never,
  SHeaders extends StandardSchemaV1 = never,
  SQueries extends StandardSchemaV1 = never,
  SBodyMapping extends StandardSchemaRequestContentBodyMappingBase = never,
>(options: {
  params?: SParams;
  headers?: SHeaders;
  queries?: SQueries;
  body?: StandardSchemaRequestContentBody<SBodyMapping>;
}): KoriStandardSchemaRequest<
  KoriStandardSchema<SParams>,
  KoriStandardSchema<SHeaders>,
  KoriStandardSchema<SQueries>,
  never,
  StandardSchemaBodyMappingToBodyMapping<SBodyMapping>
>;

// Impl
export function standardSchemaRequest<
  SParams extends StandardSchemaV1 = never,
  SHeaders extends StandardSchemaV1 = never,
  SQueries extends StandardSchemaV1 = never,
  SBody extends StandardSchemaV1 = never,
  SBodyMapping extends StandardSchemaRequestContentBodyMappingBase = never,
>(options: {
  params?: SParams;
  headers?: SHeaders;
  queries?: SQueries;
  body?: StandardSchemaRequestSimpleBody<SBody> | StandardSchemaRequestContentBody<SBodyMapping>;
}): KoriStandardSchemaRequest<
  KoriStandardSchema<SParams>,
  KoriStandardSchema<SHeaders>,
  KoriStandardSchema<SQueries>,
  KoriStandardSchema<SBody>,
  StandardSchemaBodyMappingToBodyMapping<SBodyMapping>
> {
  const params = options.params ? createKoriStandardSchema(options.params) : undefined;
  const headers = options.headers ? createKoriStandardSchema(options.headers) : undefined;
  const queries = options.queries ? createKoriStandardSchema(options.queries) : undefined;

  let simpleBody:
    | KoriStandardSchema<SBody>
    | { description?: string; schema: KoriStandardSchema<SBody>; examples?: Record<string, unknown> }
    | undefined;

  let contentBody: KoriRequestSchemaContentBody<StandardSchemaBodyMappingToBodyMapping<SBodyMapping>> | undefined;

  if (options.body) {
    if (isStandardSchema(options.body)) {
      // simple body
      simpleBody = createKoriStandardSchema(options.body);
    } else if (!('content' in options.body)) {
      simpleBody = {
        description: options.body.description,
        schema: createKoriStandardSchema(options.body.schema),
        examples: options.body.examples,
      };
    } else {
      // content body
      contentBody = {
        description: options.body.description,
        content: mapStandardSchemaBodyMapping(options.body.content),
      };
    }
  }

  if (contentBody) {
    return createKoriRequestSchema({
      provider: STANDARD_SCHEMA_PROVIDER,
      params,
      headers,
      queries,
      body: contentBody,
    });
  } else {
    return createKoriRequestSchema({
      provider: STANDARD_SCHEMA_PROVIDER,
      params,
      headers,
      queries,
      body: simpleBody,
    });
  }
}
