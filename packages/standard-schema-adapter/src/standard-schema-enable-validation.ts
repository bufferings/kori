import {
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
  type KoriInstanceRequestValidationFailureHandler,
  type KoriInstanceResponseValidationFailureHandler,
} from '@korix/kori';

import { createKoriStandardSchemaValidator, type KoriStandardSchemaValidator } from './standard-schema-validator.js';

export function enableStandardSchemaRequestValidation(options?: {
  onRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriStandardSchemaValidator
  >;
}): {
  requestValidator: KoriStandardSchemaValidator;
  onRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriStandardSchemaValidator
  >;
} {
  return {
    requestValidator: createKoriStandardSchemaValidator(),
    onRequestValidationFailure: options?.onRequestValidationFailure,
  };
}

export function enableStandardSchemaResponseValidation(options?: {
  onResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriStandardSchemaValidator
  >;
}): {
  responseValidator: KoriStandardSchemaValidator;
  onResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriStandardSchemaValidator
  >;
} {
  return {
    responseValidator: createKoriStandardSchemaValidator(),
    onResponseValidationFailure: options?.onResponseValidationFailure,
  };
}

export function enableStandardSchemaRequestAndResponseValidation(options?: {
  onRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriStandardSchemaValidator
  >;
  onResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriStandardSchemaValidator
  >;
}): {
  requestValidator: KoriStandardSchemaValidator;
  responseValidator: KoriStandardSchemaValidator;
  onRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriStandardSchemaValidator
  >;
  onResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriStandardSchemaValidator
  >;
} {
  return {
    requestValidator: createKoriStandardSchemaValidator(),
    responseValidator: createKoriStandardSchemaValidator(),
    onRequestValidationFailure: options?.onRequestValidationFailure,
    onResponseValidationFailure: options?.onResponseValidationFailure,
  };
}
