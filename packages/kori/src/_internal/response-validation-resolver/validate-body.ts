import { type KoriResponse } from '../../context/index.js';
import { MediaType } from '../../http/index.js';
import {
  type KoriResponseSchemaContentEntryDefault,
  type KoriResponseSchemaSimpleEntryDefault,
} from '../../response-schema/index.js';
import { type KoriResponseValidatorDefault } from '../../response-validator/index.js';
import { type ResponseBodyValidationErrorDefault } from '../../routing/index.js';
import { isKoriSchema } from '../../schema/index.js';
import { ok, err, type KoriResult } from '../../util/index.js';

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
}): Promise<KoriResult<unknown, ResponseBodyValidationErrorDefault>> {
  // Skip validation for streaming responses
  if (res.isStream()) {
    return ok(undefined);
  }

  const responseMediaType = res.getMediaType();

  if (!('content' in schemaEntry)) {
    // KoriResponseSchemaSimpleEntry
    if (responseMediaType !== DEFAULT_MEDIA_TYPE) {
      return err({
        stage: 'pre-validation',
        type: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported Media Type',
        supportedTypes: [MediaType.APPLICATION_JSON],
        responseType: responseMediaType ?? '',
      });
    }

    const schema = isKoriSchema(schemaEntry) ? schemaEntry : schemaEntry.schema;

    const result = await validator.validateBody({ schema, body: res.getBody() });
    if (result.ok) {
      return ok(result.value);
    }

    return err({
      stage: 'validation',
      error: result.error,
    });
  } else {
    // KoriResponseSchemaContentEntry
    const content = schemaEntry.content;
    if (!responseMediaType || !(responseMediaType in content)) {
      return err({
        stage: 'pre-validation',
        type: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported Media Type',
        supportedTypes: Object.keys(content),
        responseType: responseMediaType ?? '',
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const mediaTypeSchema = content[responseMediaType]!;
    const schema = isKoriSchema(mediaTypeSchema) ? mediaTypeSchema : mediaTypeSchema.schema;

    const result = await validator.validateBody({ schema, body: res.getBody() });
    if (result.ok) {
      return ok(result.value);
    }

    return err({
      stage: 'validation',
      error: result.error,
    });
  }
}
