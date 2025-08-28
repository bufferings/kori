import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../context/index.js';
import { createKoriLoggerFactory, createInstanceLogger } from '../logging/index.js';
import { type KoriLoggerFactoryOptions, type KoriLoggerFactory } from '../logging/index.js';
import { createHonoRouter, type KoriRouter } from '../router/index.js';
import { type KoriRequestValidatorDefault } from '../request-validator/index.js';
import { type KoriResponseValidatorDefault } from '../response-validator/index.js';

import { createKoriInternal, type KoriInternalShared } from './kori-internal.js';
import { type Kori } from './kori.js';
import {
  type KoriInstanceRequestValidationErrorHandler,
  type KoriInstanceResponseValidationErrorHandler,
} from './route.js';

type CreateKoriOptions<
  RequestValidator extends KoriRequestValidatorDefault | undefined = undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined = undefined,
> = {
  requestValidator?: RequestValidator;
  responseValidator?: ResponseValidator;
  onRequestValidationError?: KoriInstanceRequestValidationErrorHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    RequestValidator
  >;
  onResponseValidationError?: KoriInstanceResponseValidationErrorHandler<
    KoriEnvironment,
    KoriRequest,
    KoriResponse,
    ResponseValidator
  >;
  router?: KoriRouter;
} & (
  | { loggerFactory: KoriLoggerFactory; loggerOptions?: never }
  | { loggerFactory?: never; loggerOptions: KoriLoggerFactoryOptions }
  | { loggerFactory?: never; loggerOptions?: never }
);

export function createKori<
  RequestValidator extends KoriRequestValidatorDefault | undefined = undefined,
  ResponseValidator extends KoriResponseValidatorDefault | undefined = undefined,
>(
  options?: CreateKoriOptions<RequestValidator, ResponseValidator>,
): Kori<KoriEnvironment, KoriRequest, KoriResponse, RequestValidator, ResponseValidator> {
  const router = options?.router ?? createHonoRouter();
  const loggerFactory = options?.loggerFactory ?? createKoriLoggerFactory(options?.loggerOptions);
  const instanceLogger = createInstanceLogger(loggerFactory);

  const shared = {
    router,
    loggerFactory,
    instanceLogger,
  } as unknown as KoriInternalShared;

  const root = createKoriInternal<KoriEnvironment, KoriRequest, KoriResponse, RequestValidator, ResponseValidator>({
    shared,
    requestValidator: options?.requestValidator,
    responseValidator: options?.responseValidator,
    onRequestValidationError: options?.onRequestValidationError,
    onResponseValidationError: options?.onResponseValidationError,
  });

  shared.root = root;
  return root;
}
