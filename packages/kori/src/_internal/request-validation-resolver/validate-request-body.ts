import { type KoriRequest } from '../../context/index.js';
import { MediaType } from '../../http/index.js';
import { type KoriRequestSchemaBase, type KoriRequestSchemaContentBodyBase } from '../../request-schema/index.js';
import { type RequestBodyValidationFailureBase } from '../../routing/index.js';
import { isKoriSchema, type KoriSchemaBase } from '../../schema/index.js';
import { fail, succeed, type KoriResult } from '../../util/index.js';
import { type KoriValidatorBase } from '../../validator/index.js';

/**
 * Finds the most specific matching media type from the schema's content map,
 * supporting exact matches, subtype wildcards, and full wildcards.
 *
 * @param options.contentSchema - The schema's content map to search within.
 * @param options.requestMediaType - The media type from the request header.
 * @returns The matched media type string, or `undefined` if no match is found.
 */
function findMatchingMediaType({
  contentSchema,
  requestMediaType,
}: {
  contentSchema: KoriRequestSchemaContentBodyBase['content'];
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

/**
 * Resolves the appropriate schema to use for validating the request body based
 * on the Content-Type header and the defined request body schema.
 *
 * @param options.bodySchema - The request body schema definition.
 * @param options.requestMediaType - The media type from the request header.
 * @returns A result containing the resolved schema, or a failure if no match is found.
 */
function resolveRequestBodySchema({
  bodySchema,
  requestMediaType,
}: {
  bodySchema: NonNullable<KoriRequestSchemaBase['body']>;
  requestMediaType: string;
}): KoriResult<{ schema: KoriSchemaBase; mediaType?: string }, RequestBodyValidationFailureBase> {
  if (!('content' in bodySchema)) {
    // KoriRequestSchemaSimpleBody
    if (requestMediaType !== DEFAULT_MEDIA_TYPE) {
      return fail({
        stage: 'pre-validation',
        type: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported Media Type',
        supportedMediaTypes: [DEFAULT_MEDIA_TYPE],
        requestMediaType: requestMediaType,
      });
    }

    const schema = isKoriSchema(bodySchema) ? bodySchema : bodySchema.schema;
    return succeed({ schema });
  } else {
    // KoriRequestSchemaContentBody
    const contentSchema = bodySchema.content;

    const matchedMediaType = findMatchingMediaType({
      contentSchema,
      requestMediaType,
    });

    if (!matchedMediaType) {
      return fail({
        stage: 'pre-validation',
        type: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported Media Type',
        supportedMediaTypes: Object.keys(contentSchema),
        requestMediaType: requestMediaType,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const mediaTypeSchema = contentSchema[matchedMediaType]!;
    const targetSchema = isKoriSchema(mediaTypeSchema) ? mediaTypeSchema : mediaTypeSchema.schema;
    return succeed({ schema: targetSchema, mediaType: matchedMediaType });
  }
}

/**
 * Parses the raw request body based on its Content-Type.
 * Gracefully handles parsing errors.
 *
 * @param req - The Kori request object.
 * @returns A result containing the parsed body, or a failure if parsing fails.
 */
async function parseRequestBody(req: KoriRequest): Promise<KoriResult<unknown, RequestBodyValidationFailureBase>> {
  try {
    const body = await req.parseBody();
    return succeed(body);
  } catch (error) {
    return fail({
      stage: 'pre-validation' as const,
      type: 'INVALID_BODY' as const,
      message: 'Failed to parse request body',
      cause: error,
    });
  }
}

/**
 * Validates the parsed request body against a resolved schema.
 *
 * @param options.validator - The request validator.
 * @param options.schema - The resolved schema to validate against.
 * @param options.body - The parsed request body to validate.
 * @returns A result containing the validated body, or a failure if validation fails.
 */
async function validateParsedBody({
  validator,
  schema,
  body,
}: {
  validator: KoriValidatorBase;
  schema: KoriSchemaBase;
  body: unknown;
}): Promise<KoriResult<unknown, RequestBodyValidationFailureBase>> {
  const result = await validator.validate({ schema, value: body });
  if (result.success) {
    return result;
  }

  return fail({
    stage: 'validation',
    reason: result.reason,
  });
}

/**
 * Validates the request body against a schema.
 *
 * @param options.validator - The request validator.
 * @param options.schema - The request body schema.
 * @param options.req - The Kori request object.
 * @returns A result containing the validated body, or a failure if validation fails.
 *
 * @internal
 */
export async function validateRequestBody<V extends KoriValidatorBase>({
  validator,
  schema,
  req,
}: {
  validator: V;
  schema: KoriRequestSchemaBase['body'];
  req: KoriRequest;
}): Promise<KoriResult<unknown, RequestBodyValidationFailureBase>> {
  if (!schema) {
    return succeed(undefined);
  }

  const requestMediaType = req.mediaType();
  if (requestMediaType === undefined) {
    return fail({
      stage: 'pre-validation',
      type: 'MISSING_CONTENT_TYPE',
      message: 'content-type header is required',
    });
  }

  const resolveResult = resolveRequestBodySchema({ bodySchema: schema, requestMediaType });
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
