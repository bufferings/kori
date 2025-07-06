import { type KoriRequest } from '../context/index.js';
import { DEFAULT_CONTENT_TYPE } from '../http/index.js';
import {
  type KoriRequestSchemaDefault,
  type KoriRequestSchemaContentDefault,
  type KoriSchemaDefault,
  isKoriSchema,
} from '../schema/index.js';
import { ok, err, type KoriResult } from '../util/index.js';

import { type KoriBodyValidationError } from './request-validation-error.js';

function findMatchingMediaType({
  requestContentType,
  contentSchema,
}: {
  requestContentType: string;
  contentSchema: KoriRequestSchemaContentDefault;
}): string | undefined {
  // 1. Exact match
  if (requestContentType in contentSchema) {
    return requestContentType;
  }

  // 2. Subtype wildcard (e.g., application/*)
  const [mainType] = requestContentType.split('/');
  const subtypeWildcard = `${mainType}/*`;
  if (subtypeWildcard in contentSchema) {
    return subtypeWildcard;
  }

  // 3. Full wildcard (*/*)
  if ('*/*' in contentSchema) {
    return '*/*';
  }

  return undefined;
}

export function resolveRequestBodySchema({
  req,
  schema,
}: {
  req: KoriRequest;
  schema: NonNullable<KoriRequestSchemaDefault['body']>;
}): KoriResult<{ schema: KoriSchemaDefault; mediaType?: string }, KoriBodyValidationError<unknown>> {
  if (isKoriSchema(schema)) {
    return ok({ schema });
  }

  const requestContentType = req.contentType() ?? DEFAULT_CONTENT_TYPE;
  const contentSchema = (schema.content ?? schema) as KoriRequestSchemaContentDefault;

  const matchedMediaType = findMatchingMediaType({ contentSchema, requestContentType });
  if (!matchedMediaType) {
    return err({
      stage: 'pre-validation',
      type: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Unsupported Media Type',
      supportedTypes: Object.keys(contentSchema),
      requestedType: requestContentType,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const mediaTypeSchema = contentSchema[matchedMediaType]!;
  const targetSchema = isKoriSchema(mediaTypeSchema) ? mediaTypeSchema : mediaTypeSchema.schema;
  return ok({
    schema: targetSchema,
    mediaType: matchedMediaType,
  });
}
