import { type KoriRequest } from '../context/index.js';
import { type InferSchemaOutput } from '../schema/index.js';
import {
  type InferRequestSchemaBody,
  type InferRequestSchemaHeaders,
  type InferRequestSchemaParams,
  type InferRequestSchemaQueries,
  type KoriRequestSchemaDefault,
} from '../schema-request/index.js';

import { type KoriRequestValidatorDefault } from './validator.js';

export type InferValidationOutput<S extends KoriRequestSchemaDefault> = {
  validatedParams(): InferSchemaOutput<InferRequestSchemaParams<S>>;
  validatedQueries(): InferSchemaOutput<InferRequestSchemaQueries<S>>;
  validatedHeaders(): InferSchemaOutput<InferRequestSchemaHeaders<S>>;
  validatedBody(): InferRequestSchemaBody<S>;
};

export type WithValidatedRequest<
  Req extends KoriRequest,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  RequestSchema extends KoriRequestSchemaDefault | undefined,
> = Req &
  (RequestValidator extends KoriRequestValidatorDefault
    ? RequestSchema extends KoriRequestSchemaDefault
      ? InferValidationOutput<RequestSchema>
      : unknown
    : unknown);
