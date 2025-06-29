import {
  type InferRequestValidatorSchemaProvider,
  type KoriRequestValidatorDefault,
} from '../request-validation/index.js';
import {
  type InferResponseValidatorSchemaProvider,
  type KoriResponseValidatorDefault,
} from '../response-validation/index.js';
import {
  type SchemaProvidersMatch,
  type InferRequestSchemaProvider,
  type KoriRequestSchemaDefault,
  type KoriResponseSchemaDefault,
  type InferResponseSchemaProvider,
} from '../schema/index.js';

export type RequestProviderCompatibility<
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  RequestSchema extends KoriRequestSchemaDefault | undefined,
> = RequestValidator extends KoriRequestValidatorDefault
  ? RequestSchema extends KoriRequestSchemaDefault
    ? SchemaProvidersMatch<
        InferRequestValidatorSchemaProvider<RequestValidator>,
        InferRequestSchemaProvider<RequestSchema>
      > extends true
      ? unknown
      : {
          _RequestValidatorAndSchemaProviderMismatch: 'Request validator and schema providers do not match';
        }
    : unknown
  : unknown;

export type ResponseProviderCompatibility<
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
  ResponseSchema extends KoriResponseSchemaDefault | undefined,
> = ResponseValidator extends KoriResponseValidatorDefault
  ? ResponseSchema extends KoriResponseSchemaDefault
    ? SchemaProvidersMatch<
        InferResponseValidatorSchemaProvider<ResponseValidator>,
        InferResponseSchemaProvider<ResponseSchema>
      > extends true
      ? unknown
      : {
          _ResponseValidatorAndSchemaProviderMismatch: 'Response validator and schema providers do not match';
        }
    : unknown
  : unknown;
