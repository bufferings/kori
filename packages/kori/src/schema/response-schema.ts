import { type KoriSchemaProviderDefault } from './schema-provider.js';
import { type KoriSchemaDefault } from './schema.js';

const ProviderProp = Symbol('schema-provider-prop');

type CommonStatusCode =
  | '200'
  | '201'
  | '202'
  | '204'
  | '301'
  | '302'
  | '304'
  | '400'
  | '401'
  | '403'
  | '404'
  | '409'
  | '500'
  | '502'
  | '503';

type StatusCodePattern =
  | CommonStatusCode
  | '1XX'
  | '2XX'
  | '3XX'
  | '4XX'
  | '5XX'
  | 'default'
  | `${number}${number}${number}`;

/**
 * Defines the content for a specific media type.
 * It can be the schema directly, or an object containing the schema for more details.
 * @example userSchema
 * @example { schema: userSchema, examples: { 'application/json': { summary: 'An example', value: { id: 1 } } } }
 */
export type KoriResponseSchemaMediaType<S extends KoriSchemaDefault> =
  | S
  | {
      schema: S;
      examples?: Record<string, unknown>;
    };

export type KoriResponseSchemaMediaTypeDefault = KoriResponseSchemaMediaType<KoriSchemaDefault>;

/**
 * A map of media types to their content definitions, mirroring OpenAPI's Content Object.
 * @example { 'application/json': userSchema }
 * @example { 'application/json': { schema: userSchema } }
 */
export type KoriResponseSchemaContent<S extends KoriSchemaDefault> = Record<string, KoriResponseSchemaMediaType<S>>;

export type KoriResponseSchemaContentDefault = KoriResponseSchemaContent<KoriSchemaDefault>;

export type KoriResponseSchemaSpec<S extends KoriSchemaDefault> = {
  content: S | KoriResponseSchemaContent<S>;
  description?: string;
  headers?: Record<string, unknown>;
  links?: Record<string, unknown>;
};

export type KoriResponseSchemaSpecDefault = KoriResponseSchemaSpec<KoriSchemaDefault>;

export type KoriResponseSchemaValue<S extends KoriSchemaDefault> =
  | S
  | KoriResponseSchemaContent<S>
  | KoriResponseSchemaSpec<S>;

export type KoriResponseSchemaValueDefault = KoriResponseSchemaValue<KoriSchemaDefault>;

export type KoriResponseSchemaStructure<S extends KoriSchemaDefault> = Partial<
  Record<StatusCodePattern, KoriResponseSchemaValue<S>>
>;

export type KoriResponseSchema<P extends KoriSchemaProviderDefault, S extends KoriSchemaDefault> = {
  readonly [ProviderProp]?: P;
} & KoriResponseSchemaStructure<S>;

export type KoriResponseSchemaDefault = KoriResponseSchema<KoriSchemaProviderDefault, KoriSchemaDefault>;

export type InferResponseSchemaProvider<S> =
  S extends KoriResponseSchema<infer Provider, infer _Schema> ? Provider : never;
