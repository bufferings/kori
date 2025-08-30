import { type KoriRequest } from '../../context/index.js';
import { ContentType } from '../../http/index.js';
import { type KoriRequestSchemaContentBodyDefault, type KoriRequestSchemaDefault } from '../../request-schema/index.js';
import { type KoriRequestValidatorDefault } from '../../request-validator/index.js';
import { type KoriSchemaDefault, isKoriSchema } from '../../schema/index.js';
import { ok, err, type KoriResult } from '../../util/index.js';

import { type BodyValidationErrorDefault } from './validation-result.js';

function findMatchingMediaType({
  contentSchema,
  requestContentType,
}: {
  contentSchema: KoriRequestSchemaContentBodyDefault['content'];
  requestContentType: string;
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

const DEFAULT_CONTENT_TYPE = ContentType.APPLICATION_JSON;

function resolveRequestBodySchema({
  bodySchema,
  req,
}: {
  bodySchema: NonNullable<KoriRequestSchemaDefault['body']>;
  req: KoriRequest;
}): KoriResult<{ schema: KoriSchemaDefault; mediaType?: string }, BodyValidationErrorDefault> {
  const requestContentType = req.contentType();

  if (!('content' in bodySchema)) {
    // KoriRequestSchemaSimpleBody
    const schema = isKoriSchema(bodySchema) ? bodySchema : bodySchema.schema;

    if (requestContentType === undefined || requestContentType === DEFAULT_CONTENT_TYPE) {
      return ok({ schema });
    }

    return err({
      stage: 'pre-validation',
      type: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Unsupported Media Type',
      supportedTypes: [DEFAULT_CONTENT_TYPE],
      requestedType: requestContentType,
    });
  } else {
    // KoriRequestSchemaContentBody
    const contentSchema = bodySchema.content;

    const matchedMediaType = findMatchingMediaType({
      contentSchema,
      requestContentType: requestContentType ?? DEFAULT_CONTENT_TYPE,
    });
    if (!matchedMediaType) {
      return err({
        stage: 'pre-validation',
        type: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported Media Type',
        supportedTypes: Object.keys(contentSchema),
        requestedType: requestContentType ?? '',
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

async function parseRequestBody(req: KoriRequest): Promise<KoriResult<unknown, BodyValidationErrorDefault>> {
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
}): Promise<KoriResult<unknown, BodyValidationErrorDefault>> {
  const result = await validator.validateBody({ schema, body });
  if (result.ok) {
    return result;
  }

  return err({
    stage: 'validation',
    error: result.error,
  });
}

/** @internal */
export async function validateRequestBody({
  validator,
  schema,
  req,
}: {
  validator: KoriRequestValidatorDefault;
  schema: KoriRequestSchemaDefault['body'];
  req: KoriRequest;
}): Promise<KoriResult<unknown, BodyValidationErrorDefault>> {
  if (!schema) {
    return ok(undefined);
  }

  const resolveResult = resolveRequestBodySchema({ bodySchema: schema, req });
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
