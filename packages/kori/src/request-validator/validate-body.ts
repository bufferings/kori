import { type KoriRequest } from '../context/index.js';
import { ContentType } from '../http/index.js';
import { type KoriSchemaDefault, isKoriSchema } from '../schema/index.js';
import { type KoriRequestSchemaContentBodyDefault, type KoriRequestSchemaDefault } from '../request-schema/index.js';
import { ok, err, type KoriResult } from '../util/index.js';

import { type KoriBodyValidationError } from './error.js';
import { type KoriRequestValidatorDefault } from './request-validator.js';

function findMatchingMediaType({
  requestContentType,
  contentSchema,
}: {
  requestContentType: string;
  contentSchema: KoriRequestSchemaContentBodyDefault['content'];
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

/** Default content-type for request validation when no Content-Type header is present */
const DEFAULT_CONTENT_TYPE = ContentType.APPLICATION_JSON;

function resolveRequestBodySchema({
  req,
  bodySchema,
}: {
  req: KoriRequest;
  bodySchema: NonNullable<KoriRequestSchemaDefault['body']>;
}): KoriResult<{ schema: KoriSchemaDefault; mediaType?: string }, KoriBodyValidationError<unknown>> {
  const requestContentType = req.contentType() ?? DEFAULT_CONTENT_TYPE;

  if (!('content' in bodySchema)) {
    // KoriRequestSchemaSimpleBody
    const schema = isKoriSchema(bodySchema) ? bodySchema : bodySchema.schema;

    if (requestContentType !== DEFAULT_CONTENT_TYPE) {
      return err({
        stage: 'pre-validation',
        type: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported Media Type',
        supportedTypes: [DEFAULT_CONTENT_TYPE],
        requestedType: requestContentType,
      });
    }

    return ok({ schema });
  } else {
    // KoriRequestSchemaBody
    const contentSchema = bodySchema.content;

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
}

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

  const resolveResult = resolveRequestBodySchema({ req, bodySchema: schema });
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
