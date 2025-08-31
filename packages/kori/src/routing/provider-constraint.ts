import { type InferRequestSchemaProvider, type KoriRequestSchemaDefault } from '../request-schema/index.js';
import { type InferRequestValidationProvider, type KoriRequestValidatorDefault } from '../request-validator/index.js';
import { type InferResponseSchemaProvider, type KoriResponseSchemaDefault } from '../response-schema/index.js';
import {
  type InferResponseValidationProvider,
  type KoriResponseValidatorDefault,
} from '../response-validator/index.js';

export type RequestProviderConstraint<
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  RequestSchema extends KoriRequestSchemaDefault | undefined,
> = RequestValidator extends KoriRequestValidatorDefault
  ? RequestSchema extends KoriRequestSchemaDefault
    ? InferRequestValidationProvider<RequestValidator> extends InferRequestSchemaProvider<RequestSchema>
      ? unknown
      : { _ProviderMismatch: 'Request validator and request schema providers do not match' }
    : unknown
  : unknown;

export type ResponseProviderConstraint<
  ResponseValidator extends KoriResponseValidatorDefault | undefined,
  ResponseSchema extends KoriResponseSchemaDefault | undefined,
> = ResponseValidator extends KoriResponseValidatorDefault
  ? ResponseSchema extends KoriResponseSchemaDefault
    ? InferResponseValidationProvider<ResponseValidator> extends InferResponseSchemaProvider<ResponseSchema>
      ? unknown
      : { _ProviderMismatch: 'Response validator and response schema providers do not match' }
    : unknown
  : unknown;
