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

function getParseErrorInfo(contentType: string) {
  return {
    type: 'INVALID_BODY' as const,
    message: `Failed to parse request body as ${contentType}`,
  };
}

function resolveContentTypeAndSchema(
  schema: NonNullable<KoriRequestSchemaDefault['body']>,
  requestContentType: string | null,
): KoriResult<
  { isSimpleSchema: boolean; contentType: string; targetSchema: KoriSchemaDefault },
  KoriBodyValidationError<unknown>
> {
  const contentType = requestContentType ?? ContentType.APPLICATION_JSON;

  if (isKoriSchema(schema)) {
    return ok({ isSimpleSchema: true, contentType, targetSchema: schema });
  }

  const content = (schema.content ?? schema) as KoriRequestSchemaContentDefault;
  if (!(contentType in content)) {
    return err({
      stage: 'pre-validation',
      type: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Unsupported Media Type',
      supportedTypes: Object.keys(content),
      requestedType: contentType,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const mediaTypeSchema = content[contentType]!;
  const targetSchema = isKoriSchema(mediaTypeSchema) ? mediaTypeSchema : mediaTypeSchema.schema;
  return ok({ isSimpleSchema: false, contentType, targetSchema });
}

async function parseRequestBodyWithContentType(
  req: KoriRequest,
  contentType: string,
): Promise<KoriResult<unknown, KoriBodyValidationError<unknown>>> {
  try {
    const body = req.parseBodyCustom ? await req.parseBodyCustom() : await req.parseBody();
    return ok(body);
  } catch (error) {
    const errorInfo = getParseErrorInfo(contentType);
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

  const resolveResult = resolveContentTypeAndSchema(schema, req.contentType() ?? null);
  if (!resolveResult.ok) {
    return resolveResult;
  }

  const { isSimpleSchema, contentType, targetSchema } = resolveResult.value;

  const parseResult = await parseRequestBodyWithContentType(req, contentType);
  if (!parseResult.ok) {
    return parseResult;
  }

  const validationResult = await validateParsedBody(validator, targetSchema, parseResult.value);
  if (!validationResult.ok) {
    return validationResult;
  }

  if (isSimpleSchema) {
    return ok(validationResult.value);
  } else {
    return ok({ contentType, data: validationResult.value });
  }
}
