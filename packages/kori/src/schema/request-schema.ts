import { type KoriSchemaProviderDefault } from './schema-provider.js';
import { type KoriSchemaDefault } from './schema.js';

const ProviderProp = Symbol('schema-provider-prop');

export type KoriRequestSchemaMediaType<S extends KoriSchemaDefault> =
  | S
  | {
      schema: S;
      examples?: Record<string, unknown>;
    };

export type KoriRequestSchemaMediaTypeDefault = KoriRequestSchemaMediaType<KoriSchemaDefault>;

export type KoriRequestSchemaContent<S extends KoriSchemaDefault> = Record<string, KoriRequestSchemaMediaType<S>>;

export type KoriRequestSchemaContentDefault = KoriRequestSchemaContent<KoriSchemaDefault>;

export type KoriRequestSchemaBody<S extends KoriSchemaDefault> = {
  description?: string;
  content: KoriRequestSchemaContent<S>;
  required?: boolean;
};

export type KoriRequestSchemaBodyDefault = KoriRequestSchemaBody<KoriSchemaDefault>;

export type KoriRequestSchemaStructure<
  Params extends KoriSchemaDefault = never,
  Headers extends KoriSchemaDefault = never,
  Queries extends KoriSchemaDefault = never,
  Body extends KoriSchemaDefault = never,
> = {
  params?: Params;
  headers?: Headers;
  queries?: Queries;
  body?: Body | KoriRequestSchemaContent<Body> | KoriRequestSchemaBody<Body>;
};

export type KoriRequestSchema<
  Provider extends KoriSchemaProviderDefault,
  Params extends KoriSchemaDefault = never,
  Headers extends KoriSchemaDefault = never,
  Queries extends KoriSchemaDefault = never,
  Body extends KoriSchemaDefault = never,
> = {
  readonly [ProviderProp]?: Provider;
} & KoriRequestSchemaStructure<Params, Headers, Queries, Body>;

export type KoriRequestSchemaDefault = KoriRequestSchema<
  KoriSchemaProviderDefault,
  KoriSchemaDefault,
  KoriSchemaDefault,
  KoriSchemaDefault,
  KoriSchemaDefault
>;

export type InferRequestSchemaProvider<S> =
  S extends KoriRequestSchema<infer Provider, infer _Params, infer _Headers, infer _Queries, infer _Body>
    ? Provider
    : never;

export type NormalizeBodyType<T> =
  T extends KoriRequestSchemaBody<infer S> ? S : T extends KoriRequestSchemaContent<infer S> ? S : T;
