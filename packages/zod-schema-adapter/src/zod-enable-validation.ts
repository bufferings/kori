import {
  type KoriEnvironment,
  type KoriRequest,
  type KoriResponse,
  type KoriInstanceRequestValidationFailureHandler,
  type KoriInstanceResponseValidationFailureHandler,
} from '@korix/kori';

import { createKoriZodValidator, type KoriZodValidator } from './zod-validator.js';

export function enableZodRequestValidation(options?: {
  onRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriZodValidator
  >;
}): {
  requestValidator: KoriZodValidator;
  onRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriZodValidator
  >;
} {
  return {
    requestValidator: createKoriZodValidator(),
    onRequestValidationFailure: options?.onRequestValidationFailure,
  };
}

export function enableZodResponseValidation(options?: {
  onResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriZodValidator
  >;
}): {
  responseValidator: KoriZodValidator;
  onResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriZodValidator
  >;
} {
  return {
    responseValidator: createKoriZodValidator(),
    onResponseValidationFailure: options?.onResponseValidationFailure,
  };
}

export function enableZodRequestAndResponseValidation(options?: {
  onRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriZodValidator
  >;
  onResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriZodValidator
  >;
}): {
  requestValidator: KoriZodValidator;
  responseValidator: KoriZodValidator;
  onRequestValidationFailure?: KoriInstanceRequestValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriZodValidator
  >;
  onResponseValidationFailure?: KoriInstanceResponseValidationFailureHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    KoriZodValidator
  >;
} {
  return {
    requestValidator: createKoriZodValidator(),
    responseValidator: createKoriZodValidator(),
    onRequestValidationFailure: options?.onRequestValidationFailure,
    onResponseValidationFailure: options?.onResponseValidationFailure,
  };
}
