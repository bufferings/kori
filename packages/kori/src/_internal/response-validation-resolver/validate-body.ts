import { type KoriResponse } from '../../context/index.js';
import { ContentType } from '../../http/index.js';
import {
  type KoriResponseSchemaContentEntryDefault,
  type KoriResponseSchemaSimpleEntryDefault,
} from '../../response-schema/index.js';
import { type KoriResponseValidatorDefault } from '../../response-validator/index.js';
import { type ResponseBodyValidationErrorDefault } from '../../routing/index.js';
import { isKoriSchema } from '../../schema/index.js';
import { ok, err, type KoriResult } from '../../util/index.js';

const DEFAULT_CONTENT_TYPE = ContentType.APPLICATION_JSON;

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

  const responseContentType = res.getContentType()?.split(';')[0]?.trim();

  if (!('content' in schemaEntry)) {
    // KoriResponseSchemaSimpleEntry
    if (responseContentType !== DEFAULT_CONTENT_TYPE) {
      return err({
        stage: 'pre-validation',
        type: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported Media Type',
        supportedTypes: [ContentType.APPLICATION_JSON],
        responseType: responseContentType ?? '',
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
    if (!responseContentType || !(responseContentType in content)) {
      return err({
        stage: 'pre-validation',
        type: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported Media Type',
        supportedTypes: Object.keys(content),
        responseType: responseContentType ?? '',
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const mediaTypeSchema = content[responseContentType]!;
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
