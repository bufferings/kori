import { type InferRequestSchemaProvider, type KoriRequestSchemaDefault } from '../schema-request/index.js';
import { type InferResponseSchemaProvider, type KoriResponseSchemaDefault } from '../schema-response/index.js';
import { type InferRequestValidationProvider, type KoriRequestValidatorDefault } from '../validation-request/index.js';
import {
  type InferResponseValidationProvider,
  type KoriResponseValidatorDefault,
} from '../validation-response/index.js';

export type RequestProviderCompatibility<
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  RequestSchema extends KoriRequestSchemaDefault | undefined,
> = RequestValidator extends KoriRequestValidatorDefault
  ? RequestSchema extends KoriRequestSchemaDefault
    ? InferRequestValidationProvider<RequestValidator> extends InferRequestSchemaProvider<RequestSchema>
      ? unknown
      : { _RequestValidatorAndSchemaProviderMismatch: 'Request validator and schema providers do not match' }
    : unknown
  : unknown;

export type ResponseProviderCompatibility<
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
  ResponseSchema extends KoriResponseSchemaDefault | undefined,
> = ResponseValidator extends KoriResponseValidatorDefault
  ? ResponseSchema extends KoriResponseSchemaDefault
    ? InferResponseValidationProvider<ResponseValidator> extends InferResponseSchemaProvider<ResponseSchema>
      ? unknown
      : { _ResponseValidatorAndSchemaProviderMismatch: 'Response validator and schema providers do not match' }
    : unknown
  : unknown;
