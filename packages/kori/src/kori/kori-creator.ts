import { type KoriEnvironment, type KoriRequest, type KoriResponse } from '../context/index.js';
import { createKoriLoggerFactory } from '../logging/index.js';
import { type KoriLoggerOptions, type KoriLoggerFactory } from '../logging/index.js';
import { type KoriRequestValidatorDefault } from '../request-validation/index.js';
import { type KoriResponseValidatorDefault } from '../response-validation/index.js';
import { createHonoRouter, type KoriRouter } from '../router/index.js';

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
  | { loggerFactory?: never; loggerOptions: KoriLoggerOptions }
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
  const instanceLogger = loggerFactory({ channel: 'app', name: 'instance' });

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

  root.onError((ctx, _err) => {
    if (!ctx.res.isReady()) {
      ctx.res.internalError({
        message: 'Internal Server Error',
      });
    }
  });

  return root;
}
