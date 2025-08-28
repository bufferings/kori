import { type KoriRequest } from '../context/index.js';
import {
  type InferRequestSchemaBodyOutput,
  type InferRequestSchemaHeadersOutput,
  type InferRequestSchemaParamsOutput,
  type InferRequestSchemaQueriesOutput,
  type KoriRequestSchemaDefault,
} from '../request-schema/index.js';

import { type KoriRequestValidatorDefault } from './request-validator.js';

export type InferValidationOutput<S extends KoriRequestSchemaDefault> = {
  validatedParams(): InferRequestSchemaParamsOutput<S>;
  validatedQueries(): InferRequestSchemaQueriesOutput<S>;
  validatedHeaders(): InferRequestSchemaHeadersOutput<S>;
  validatedBody(): InferRequestSchemaBodyOutput<S>;
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
