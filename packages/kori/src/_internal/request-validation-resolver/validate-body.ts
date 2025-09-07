import { type KoriRequest } from '../../context/index.js';
import { MediaType } from '../../http/index.js';
import { type KoriRequestSchemaContentBodyDefault, type KoriRequestSchemaDefault } from '../../request-schema/index.js';
import { type KoriRequestValidatorDefault } from '../../request-validator/index.js';
import { type RequestBodyValidationFailureDefault } from '../../routing/index.js';
import { type KoriSchemaDefault, isKoriSchema } from '../../schema/index.js';
import { succeed, fail, type KoriResult } from '../../util/index.js';

function findMatchingMediaType({
  contentSchema,
  requestMediaType,
}: {
  contentSchema: KoriRequestSchemaContentBodyDefault['content'];
  requestMediaType: string;
}): string | undefined {
  // 1. Exact match
  if (requestMediaType in contentSchema) {
    return requestMediaType;
  }

  // 2. Subtype wildcard (e.g., application/*)
  const [mainType] = requestMediaType.split('/');
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

const DEFAULT_MEDIA_TYPE = MediaType.APPLICATION_JSON;

function resolveRequestBodySchema({
  bodySchema,
  req,
}: {
  bodySchema: NonNullable<KoriRequestSchemaDefault['body']>;
  req: KoriRequest;
}): KoriResult<{ schema: KoriSchemaDefault; mediaType?: string }, RequestBodyValidationFailureDefault> {
  const requestMediaType = req.mediaType();

  if (!('content' in bodySchema)) {
    // KoriRequestSchemaSimpleBody
    const schema = isKoriSchema(bodySchema) ? bodySchema : bodySchema.schema;

    if (requestMediaType === undefined || requestMediaType === DEFAULT_MEDIA_TYPE) {
      return succeed({ schema });
    }

    return fail({
      stage: 'pre-validation',
      type: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Unsupported Media Type',
      supportedMediaTypes: [DEFAULT_MEDIA_TYPE],
      requestMediaType: requestMediaType,
    });
  } else {
    // KoriRequestSchemaContentBody
    const contentSchema = bodySchema.content;

    const matchedMediaType = findMatchingMediaType({
      contentSchema,
      requestMediaType: requestMediaType ?? DEFAULT_MEDIA_TYPE,
    });
    if (!matchedMediaType) {
      return fail({
        stage: 'pre-validation',
        type: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported Media Type',
        supportedMediaTypes: Object.keys(contentSchema),
        requestMediaType: requestMediaType ?? '',
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const mediaTypeSchema = contentSchema[matchedMediaType]!;
    const targetSchema = isKoriSchema(mediaTypeSchema) ? mediaTypeSchema : mediaTypeSchema.schema;
    return succeed({
      schema: targetSchema,
      mediaType: matchedMediaType,
    });
  }
}

async function parseRequestBody(req: KoriRequest): Promise<KoriResult<unknown, RequestBodyValidationFailureDefault>> {
  try {
    const body = await req.parseBody();
    return succeed(body);
  } catch (error) {
    return fail({
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
}): Promise<KoriResult<unknown, RequestBodyValidationFailureDefault>> {
  const result = await validator.validateBody({ schema, body });
  if (result.success) {
    return result;
  }

  return fail({
    stage: 'validation',
    reason: result.reason,
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
}): Promise<KoriResult<unknown, RequestBodyValidationFailureDefault>> {
  if (!schema) {
    return succeed(undefined);
  }

  const resolveResult = resolveRequestBodySchema({ bodySchema: schema, req });
  if (!resolveResult.success) {
    return resolveResult;
  }

  const { schema: resolvedSchema, mediaType: resolvedMediaType } = resolveResult.value;

  const parseResult = await parseRequestBody(req);
  if (!parseResult.success) {
    return parseResult;
  }

  const validationResult = await validateParsedBody({
    validator,
    schema: resolvedSchema,
    body: parseResult.value,
  });
  if (!validationResult.success) {
    return validationResult;
  }

  return resolvedMediaType
    ? succeed({ mediaType: resolvedMediaType, value: validationResult.value })
    : succeed(validationResult.value);
}
