import { type KoriRequest } from '../context/index.js';
import { ContentType } from '../http/index.js';
import {
  type KoriRequestSchemaDefault,
  type KoriRequestSchemaContentDefault,
  type KoriSchemaDefault,
  isKoriSchema,
} from '../schema/index.js';
import { ok, err, type KoriResult } from '../util/index.js';

import { type KoriBodyValidationError } from './request-validation-error.js';
import { type KoriRequestValidatorDefault } from './request-validator.js';

function getParseErrorInfo() {
  return {
    type: 'INVALID_BODY' as const,
    message: 'Failed to parse request body',
  };
}

function resolveSchema(
  req: KoriRequest,
  schema: NonNullable<KoriRequestSchemaDefault['body']>,
): KoriResult<{ resolvedSchema: KoriSchemaDefault; resolvedMediaType?: string }, KoriBodyValidationError<unknown>> {
  if (isKoriSchema(schema)) {
    return ok({ resolvedSchema: schema });
  }

  const effectiveContentType = req.contentType() ?? ContentType.APPLICATION_JSON;
  const content = (schema.content ?? schema) as KoriRequestSchemaContentDefault;
  if (!(effectiveContentType in content)) {
    return err({
      stage: 'pre-validation',
      type: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Unsupported Media Type',
      supportedTypes: Object.keys(content),
      requestedType: effectiveContentType,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const mediaTypeSchema = content[effectiveContentType]!;
  const targetSchema = isKoriSchema(mediaTypeSchema) ? mediaTypeSchema : mediaTypeSchema.schema;
  return ok({
    resolvedSchema: targetSchema,
    resolvedMediaType: effectiveContentType,
  });
}

async function parseRequestBody(req: KoriRequest): Promise<KoriResult<unknown, KoriBodyValidationError<unknown>>> {
  try {
    const body = await req.parseBody();
    return ok(body);
  } catch (error) {
    const errorInfo = getParseErrorInfo();
    return err({
      stage: 'pre-validation',
      type: errorInfo.type,
      message: errorInfo.message,
      cause: error,
    });
  }
}

async function validateParsedBody(
  validator: KoriRequestValidatorDefault,
  schema: KoriSchemaDefault,
  body: unknown,
): Promise<KoriResult<unknown, KoriBodyValidationError<unknown>>> {
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

  const resolveResult = resolveSchema(req, schema);
  if (!resolveResult.ok) {
    return resolveResult;
  }

  const { resolvedSchema, resolvedMediaType } = resolveResult.value;

  const parseResult = await parseRequestBody(req);
  if (!parseResult.ok) {
    return parseResult;
  }

  const validationResult = await validateParsedBody(validator, resolvedSchema, parseResult.value);
  if (!validationResult.ok) {
    return validationResult;
  }

  return resolvedMediaType
    ? ok({ mediaType: resolvedMediaType, value: validationResult.value })
    : ok(validationResult.value);
}
