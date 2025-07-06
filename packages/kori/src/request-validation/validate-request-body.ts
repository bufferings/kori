import { type KoriRequest } from '../context/index.js';
import { ContentType } from '../http/index.js';
import { type KoriRequestSchemaDefault, type KoriRequestSchemaContentDefault, isKoriSchema } from '../schema/index.js';
import { ok, err, type KoriResult } from '../util/index.js';

import { type KoriBodyValidationError } from './request-validation-error.js';
import { type KoriRequestValidatorDefault } from './request-validator.js';

// Content-Type parsing strategy mapping
const CONTENT_TYPE_PARSERS = {
  [ContentType.APPLICATION_JSON]: (req: KoriRequest) => req.json(),
  [ContentType.APPLICATION_FORM_URLENCODED]: (req: KoriRequest) => req.formData(),
  [ContentType.MULTIPART_FORM_DATA]: (req: KoriRequest) => req.formData(),
  [ContentType.TEXT_PLAIN]: (req: KoriRequest) => req.text(),
  [ContentType.TEXT_HTML]: (req: KoriRequest) => req.text(),
  [ContentType.APPLICATION_OCTET_STREAM]: (req: KoriRequest) => req.arrayBuffer(),
} as const;

// Error type and message mapping
const PARSE_ERROR_MAP = {
  [ContentType.APPLICATION_JSON]: {
    type: 'INVALID_JSON' as const,
    message: 'Failed to parse request body as JSON',
  },
  [ContentType.APPLICATION_FORM_URLENCODED]: {
    type: 'INVALID_FORM_DATA' as const,
    message: 'Failed to parse request body as form data',
  },
  [ContentType.MULTIPART_FORM_DATA]: {
    type: 'INVALID_FORM_DATA' as const,
    message: 'Failed to parse request body as form data',
  },
  [ContentType.TEXT_PLAIN]: {
    type: 'INVALID_TEXT' as const,
    message: 'Failed to parse request body as text',
  },
  [ContentType.TEXT_HTML]: {
    type: 'INVALID_TEXT' as const,
    message: 'Failed to parse request body as text',
  },
  [ContentType.APPLICATION_OCTET_STREAM]: {
    type: 'INVALID_BINARY' as const,
    message: 'Failed to parse request body as binary data',
  },
} as const;

function parseRequestBody(req: KoriRequest, contentType: string): Promise<unknown> {
  const parser = CONTENT_TYPE_PARSERS[contentType as keyof typeof CONTENT_TYPE_PARSERS];
  if (!parser) {
    // Default to JSON
    return req.json();
  }
  return parser(req);
}

function getParseErrorInfo(contentType: string) {
  return (
    PARSE_ERROR_MAP[contentType as keyof typeof PARSE_ERROR_MAP] ?? {
      type: 'INVALID_JSON' as const,
      message: `Failed to parse request body as ${contentType}`,
    }
  );
}

function getDefaultContentType(content: Record<string, unknown>): string {
  // Priority: application/json > form-data > text/plain > first key
  if (ContentType.APPLICATION_JSON in content) return ContentType.APPLICATION_JSON;
  if (ContentType.APPLICATION_FORM_URLENCODED in content) return ContentType.APPLICATION_FORM_URLENCODED;
  if (ContentType.MULTIPART_FORM_DATA in content) return ContentType.MULTIPART_FORM_DATA;
  if (ContentType.TEXT_PLAIN in content) return ContentType.TEXT_PLAIN;
  return Object.keys(content)[0] ?? ContentType.APPLICATION_JSON;
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

  // Simple schema (Content-Type not specified)
  if (isKoriSchema(schema)) {
    // Use Content-Type if present, otherwise default to JSON
    const contentType = req.contentType() ?? ContentType.APPLICATION_JSON;

    try {
      const body = await parseRequestBody(req, contentType);
      const result = await validator.validateBody({ schema, body });
      if (result.ok) {
        return result;
      }

      return err({
        stage: 'validation',
        error: result.error,
      });
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

  // Content-Type specified schema
  const content = (schema.content ?? schema) as KoriRequestSchemaContentDefault;
  const contentType = req.contentType();

  // Content-Type determination: request header > default selection
  const finalContentType = contentType ?? getDefaultContentType(content);

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
  const schemaForContentType = isKoriSchema(mediaTypeSchema) ? mediaTypeSchema : mediaTypeSchema.schema;

  try {
    const body = await parseRequestBody(req, finalContentType);
    const result = await validator.validateBody({ schema: schemaForContentType, body });
    if (result.ok) {
      return ok({ contentType: finalContentType, data: result.value });
    }

    return err({
      stage: 'validation',
      error: result.error,
    });
  } catch (error) {
    const errorInfo = getParseErrorInfo(finalContentType);
    return err({
      stage: 'pre-validation',
      type: errorInfo.type,
      message: errorInfo.message,
      cause: error,
    });
  }
}
