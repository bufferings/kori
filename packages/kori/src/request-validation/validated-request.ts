import { type KoriRequest } from '../context/index.js';
import {
  type InferSchemaOutput,
  type KoriRequestSchemaDefault,
  type KoriRequestSchema,
  type KoriRequestSchemaBody,
  type KoriRequestSchemaContent,
} from '../schema/index.js';

import { type KoriRequestValidatorDefault } from './request-validator.js';

type IsNever<T> = [T] extends [never] ? true : false;

type Validated<T> = IsNever<T> extends true ? unknown : { readonly validated: T };

type ExtractRequestSchemaParams<S> =
  S extends KoriRequestSchema<infer _P, infer Params, infer _H, infer _Q, infer _B> ? Params : never;

type ExtractRequestSchemaHeaders<S> =
  S extends KoriRequestSchema<infer _P, infer _Params, infer Headers, infer _Q, infer _B> ? Headers : never;

type ExtractRequestSchemaQueries<S> =
  S extends KoriRequestSchema<infer _P, infer _Params, infer _H, infer Queries, infer _B> ? Queries : never;

type ExtractRequestSchemaBody<S> =
  S extends KoriRequestSchema<infer _P, infer _Params, infer _H, infer _Q, infer Body>
    ? Body extends KoriRequestSchemaBody<infer S>
      ? { mediaType: string; value: InferSchemaOutput<S> }
      : Body extends KoriRequestSchemaContent<infer S>
        ? { mediaType: string; value: InferSchemaOutput<S> }
        : Body
    : never;

export type InferValidationOutput<S extends KoriRequestSchemaDefault> = {
  params: InferSchemaOutput<ExtractRequestSchemaParams<S>>;
  queries: InferSchemaOutput<ExtractRequestSchemaQueries<S>>;
  headers: InferSchemaOutput<ExtractRequestSchemaHeaders<S>>;
  body: InferSchemaOutput<ExtractRequestSchemaBody<S>>;
};

export type WithValidatedRequest<
  Req extends KoriRequest,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  RequestSchema extends KoriRequestSchemaDefault | undefined,
> = Req &
  Validated<
    RequestValidator extends KoriRequestValidatorDefault
      ? RequestSchema extends KoriRequestSchemaDefault
        ? InferValidationOutput<RequestSchema>
        : never
      : never
  >;
