import {
  type KoriEnvironment,
  type KoriHandlerContext,
  type KoriRequest,
  type KoriResponse,
} from '../context/index.js';
import { type KoriRequestSchemaDefault } from '../request-schema/index.js';
import { type KoriRequestValidatorDefault } from '../request-validator/index.js';
import { type MaybePromise } from '../util/index.js';

import { type WithPathParams } from './path-params.js';
import { type ValidatedRequest } from './validated-request.js';

export type KoriHandler<
  Env extends KoriEnvironment,
  Req extends KoriRequest,
  Res extends KoriResponse,
  Path extends string,
  RequestValidator extends KoriRequestValidatorDefault | undefined,
  RequestSchema extends KoriRequestSchemaDefault | undefined,
> = (
  ctx: KoriHandlerContext<Env, ValidatedRequest<WithPathParams<Req, Path>, RequestValidator, RequestSchema>, Res>,
) => MaybePromise<KoriResponse>;
