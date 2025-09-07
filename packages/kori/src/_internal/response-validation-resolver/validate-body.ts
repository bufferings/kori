import { type KoriResponse } from '../../context/index.js';
import { MediaType } from '../../http/index.js';
import {
  type KoriResponseSchemaContentEntryDefault,
  type KoriResponseSchemaSimpleEntryDefault,
} from '../../response-schema/index.js';
import { type KoriResponseValidatorDefault } from '../../response-validator/index.js';
import { type ResponseBodyValidationFailureDefault } from '../../routing/index.js';
import { isKoriSchema } from '../../schema/index.js';
import { succeed, fail, type KoriResult } from '../../util/index.js';

const DEFAULT_MEDIA_TYPE = MediaType.APPLICATION_JSON;

/** @internal */
export async function validateResponseBody({
  validator,
  schemaEntry,
  res,
}: {
  validator: KoriResponseValidatorDefault;
  schemaEntry: KoriResponseSchemaSimpleEntryDefault | KoriResponseSchemaContentEntryDefault;
  res: KoriResponse;
}): Promise<KoriResult<unknown, ResponseBodyValidationFailureDefault>> {
  // Skip validation for streaming responses
  if (res.isStream()) {
    return succeed(undefined);
  }

  const responseMediaType = res.getMediaType();

  if (!('content' in schemaEntry)) {
    // KoriResponseSchemaSimpleEntry
    if (responseMediaType !== DEFAULT_MEDIA_TYPE) {
      return fail({
        stage: 'pre-validation',
        type: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported Media Type',
        supportedMediaTypes: [MediaType.APPLICATION_JSON],
        responseMediaType: responseMediaType ?? '',
      });
    }

    const schema = isKoriSchema(schemaEntry) ? schemaEntry : schemaEntry.schema;

    const result = await validator.validateBody({ schema, body: res.getBody() });
    if (result.success) {
      return succeed(result.value);
    }

    return fail({
      stage: 'validation',
      reason: result.reason,
    });
  } else {
    // KoriResponseSchemaContentEntry
    const content = schemaEntry.content;
    if (!responseMediaType || !(responseMediaType in content)) {
      return fail({
        stage: 'pre-validation',
        type: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported Media Type',
        supportedMediaTypes: Object.keys(content),
        responseMediaType: responseMediaType ?? '',
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const mediaTypeSchema = content[responseMediaType]!;
    const schema = isKoriSchema(mediaTypeSchema) ? mediaTypeSchema : mediaTypeSchema.schema;

    const result = await validator.validateBody({ schema, body: res.getBody() });
    if (result.success) {
      return succeed(result.value);
    }

    return fail({
      stage: 'validation',
      reason: result.reason,
    });
  }
}
