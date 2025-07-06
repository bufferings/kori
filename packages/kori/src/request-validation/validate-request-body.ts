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

function parseRequestBody(req: KoriRequest, contentType: string): Promise<unknown> {
  switch (contentType) {
    case ContentType.APPLICATION_JSON:
      return req.json();
    case ContentType.APPLICATION_FORM_URLENCODED:
    case ContentType.MULTIPART_FORM_DATA:
      return req.formData();
    case ContentType.APPLICATION_OCTET_STREAM:
      return req.arrayBuffer();
    default:
      return req.text();
  }
}

function getParseErrorInfo(contentType: string) {
  return {
    type: 'INVALID_BODY' as const,
    message: `Failed to parse request body as ${contentType}`,
  };
}

function getDefaultContentType(content: Record<string, unknown>): string {
  // Priority: application/json > form-data > text/plain > first key
  if (ContentType.APPLICATION_JSON in content) return ContentType.APPLICATION_JSON;
  if (ContentType.APPLICATION_FORM_URLENCODED in content) return ContentType.APPLICATION_FORM_URLENCODED;
  if (ContentType.MULTIPART_FORM_DATA in content) return ContentType.MULTIPART_FORM_DATA;
  if (ContentType.TEXT_PLAIN in content) return ContentType.TEXT_PLAIN;
  return Object.keys(content)[0] ?? ContentType.APPLICATION_JSON;
}

function resolveContentTypeAndSchema(
  schema: NonNullable<KoriRequestSchemaDefault['body']>,
  requestContentType: string | null,
): KoriResult<
  { isSimpleSchema: boolean; contentType: string; targetSchema: KoriSchemaDefault },
  KoriBodyValidationError<unknown>
> {
  // Simple schema (Content-Type not specified)
  if (isKoriSchema(schema)) {
    const contentType = requestContentType ?? ContentType.APPLICATION_JSON;
    return ok({ isSimpleSchema: true, contentType, targetSchema: schema });
  }

  // Content-Type specified schema
  const content = (schema.content ?? schema) as KoriRequestSchemaContentDefault;
  const finalContentType = requestContentType ?? getDefaultContentType(content);

  if (!(finalContentType in content)) {
    return err({
      stage: 'pre-validation',
      type: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Unsupported Media Type',
      supportedTypes: Object.keys(content),
      requestedType: finalContentType,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const mediaTypeSchema = content[finalContentType]!;
  const targetSchema = isKoriSchema(mediaTypeSchema) ? mediaTypeSchema : mediaTypeSchema.schema;

  return ok({ isSimpleSchema: false, contentType: finalContentType, targetSchema });
}

async function parseRequestBodyWithContentType(
  req: KoriRequest,
  contentType: string,
): Promise<KoriResult<unknown, KoriBodyValidationError<unknown>>> {
  try {
    const body = await parseRequestBody(req, contentType);
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
