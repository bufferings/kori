import { type KoriRequest } from '../context/index.js';
import { type KoriRequestSchemaDefault, type KoriSchemaDefault } from '../schema/index.js';
import { ok, err, type KoriResult } from '../util/index.js';

import { type KoriBodyValidationError } from './request-validation-error.js';
import { type KoriRequestValidatorDefault } from './request-validator.js';
import { resolveRequestBodySchema } from './resolve-request-body-schema.js';

async function parseRequestBody(req: KoriRequest): Promise<KoriResult<unknown, KoriBodyValidationError<unknown>>> {
  try {
    const body = await req.parseBody();
    return ok(body);
  } catch (error) {
    return err({
      stage: 'pre-validation',
      type: 'INVALID_BODY',
      message: 'Failed to parse request body',
      cause: error,
    });
  }
}

async function validateParsedBody({
  validator,
  schema,
  body,
}: {
  validator: KoriRequestValidatorDefault;
  schema: KoriSchemaDefault;
  body: unknown;
}): Promise<KoriResult<unknown, KoriBodyValidationError<unknown>>> {
  const result = await validator.validateBody({ schema, body });
  if (result.ok) {
    return result;
  }

  return err({
    stage: 'validation',
    error: result.error,
  });
}

export async function validateRequestBody({
  validator,
  schema,
  req,
}: {
  validator: KoriRequestValidatorDefault;
  schema: KoriRequestSchemaDefault['body'];
  req: KoriRequest;
}): Promise<KoriResult<unknown, KoriBodyValidationError<unknown>>> {
  if (!schema) {
    return ok(undefined);
  }

  const resolveResult = resolveRequestBodySchema({ req, schema });
  if (!resolveResult.ok) {
    return resolveResult;
  }

  const { schema: resolvedSchema, mediaType: resolvedMediaType } = resolveResult.value;

  const parseResult = await parseRequestBody(req);
  if (!parseResult.ok) {
    return parseResult;
  }

  const validationResult = await validateParsedBody({
    validator,
    schema: resolvedSchema,
    body: parseResult.value,
  });
  if (!validationResult.ok) {
    return validationResult;
  }

  return resolvedMediaType
    ? ok({ mediaType: resolvedMediaType, value: validationResult.value })
    : ok(validationResult.value);
}
