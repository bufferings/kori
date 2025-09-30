import { type KoriResponse } from '../../context/index.js';
import { MediaType } from '../../http/index.js';
import { type KoriResponseSchemaContentEntryBase } from '../../response-schema/index.js';
import { type ResponseBodyValidationFailureBase } from '../../routing/index.js';
import { isKoriSchema, type KoriSchemaBase } from '../../schema/index.js';
import { succeed, fail, type KoriResult } from '../../util/index.js';
import { type KoriValidatorBase } from '../../validator/index.js';

const DEFAULT_MEDIA_TYPE = MediaType.APPLICATION_JSON;

/**
 * Resolves the specific schema to use for validation from a schema entry,
 * based on the response's Content-Type.
 *
 * @param options.schemaEntry - The schema entry from the response definition.
 * @param options.responseMediaType - The media type from the response header.
 * @returns A result containing the resolved schema, or a failure if the media type is not supported.
 */
function resolveResponseBodySchema({
  schemaEntry,
  responseMediaType,
}: {
  schemaEntry: KoriSchemaBase | KoriResponseSchemaContentEntryBase;
  responseMediaType: string;
}): KoriResult<KoriSchemaBase, ResponseBodyValidationFailureBase> {
  if (isKoriSchema(schemaEntry)) {
    // simple entry
    if (responseMediaType !== DEFAULT_MEDIA_TYPE) {
      return fail({
        stage: 'pre-validation',
        type: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported Media Type',
        supportedMediaTypes: [MediaType.APPLICATION_JSON],
        responseMediaType,
      });
    }

    return succeed(schemaEntry);
  } else {
    // content entry
    const content = schemaEntry.content;
    if (!(responseMediaType in content)) {
      return fail({
        stage: 'pre-validation',
        type: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported Media Type',
        supportedMediaTypes: Object.keys(content),
        responseMediaType,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const mediaTypeSchema = content[responseMediaType]!;
    return succeed(mediaTypeSchema);
  }
}

/**
 * Validates the response body against a resolved schema entry, handling media
 * type matching and parsing. Skips validation for streaming responses.
 *
 * @param options.validator - The validator instance.
 * @param options.schemaEntry - The schema entry from the response definition.
 * @param options.res - The response object to validate.
 * @returns A result indicating success or failure of the validation.
 * @internal
 */
export async function validateResponseBody({
  validator,
  schemaEntry,
  res,
}: {
  validator: KoriValidatorBase;
  schemaEntry: KoriSchemaBase | KoriResponseSchemaContentEntryBase;
  res: KoriResponse;
}): Promise<KoriResult<unknown, ResponseBodyValidationFailureBase>> {
  // Skip validation for streaming responses
  if (res.isStream()) {
    return succeed(undefined);
  }

  const responseMediaType = res.getMediaType();
  if (responseMediaType === undefined) {
    return fail({
      stage: 'pre-validation',
      type: 'MISSING_CONTENT_TYPE',
      message: 'content-type header is required',
    });
  }

  const resolveResult = resolveResponseBodySchema({ schemaEntry, responseMediaType });
  if (!resolveResult.success) {
    return resolveResult;
  }

  const result = await validator.validate({ schema: resolveResult.value, value: res.getBody() });
  if (result.success) {
    return succeed(result.value);
  }

  return fail({
    stage: 'validation',
    reason: result.reason,
  });
}
