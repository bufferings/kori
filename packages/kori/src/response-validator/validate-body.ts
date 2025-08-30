import { type KoriResponse } from '../context/index.js';
import {
  type KoriResponseSchemaContentEntryDefault,
  type KoriResponseSchemaDefault,
  type KoriResponseSchemaSimpleEntryDefault,
} from '../response-schema/index.js';
import { isKoriSchema } from '../schema/index.js';
import { ok, err, type KoriResult } from '../util/index.js';

import { type KoriResponseBodyValidationError } from './error.js';
import { type KoriResponseValidatorDefault } from './validator.js';

function resolveResponseBodySchema({
  responseSchema,
  statusCode,
}: {
  responseSchema: KoriResponseSchemaDefault;
  statusCode: number;
}): KoriResponseSchemaSimpleEntryDefault | KoriResponseSchemaContentEntryDefault | undefined {
  const statusCodeStr = statusCode.toString();

  const responses = responseSchema.responses;

  if (statusCodeStr in responses) {
    return responses[statusCodeStr as keyof typeof responses];
  }

  const wildcardPattern = `${statusCodeStr[0]}XX`;
  if (wildcardPattern in responses) {
    return responses[wildcardPattern as keyof typeof responses];
  }

  if ('default' in responses) {
    return responses.default;
  }

  return undefined;
}

async function validateBodyWithSchema({
  validator,
  bodySchema,
  res,
}: {
  validator: KoriResponseValidatorDefault;
  bodySchema: KoriResponseSchemaSimpleEntryDefault | KoriResponseSchemaContentEntryDefault | undefined;
  res: KoriResponse;
}): Promise<KoriResult<unknown, KoriResponseBodyValidationError<unknown>>> {
  // Skip validation for streaming responses
  if (res.isStream()) {
    return ok(undefined);
  }

  if (!bodySchema) {
    // TODO: Consider
    return err({
      stage: 'pre-validation',
      type: 'UNKNOWN_ERROR',
      message: 'No response schema found for status code',
    });
  }

  if (!('content' in bodySchema)) {
    // KoriResponseSchemaSimpleBody
    // TODO: Consider Content-Types only allows JSON
    const schema = isKoriSchema(bodySchema) ? bodySchema : bodySchema.schema;

    const result = await validator.validateBody({ schema, body: res.getBody() });
    if (result.ok) {
      return ok(result.value);
    }

    return err({
      stage: 'validation',
      error: result.error,
    });
  }

  // KoriResponseSchemaBody
  const content = bodySchema.content;
  const contentType = res.getContentType()?.split(';')[0]?.trim();
  if (!contentType || !(contentType in content)) {
    return err({
      stage: 'pre-validation',
      type: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Unsupported Media Type',
      supportedTypes: Object.keys(content),
      requestedType: contentType,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const mediaTypeSchema = content[contentType]!;
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

export async function validateResponseBody({
  responseValidator,
  responseSchema,
  res,
}: {
  responseValidator: KoriResponseValidatorDefault;
  responseSchema: KoriResponseSchemaDefault;
  res: KoriResponse;
}): Promise<KoriResult<unknown, KoriResponseBodyValidationError<unknown>>> {
  const bodySchema = resolveResponseBodySchema({ responseSchema, statusCode: res.getStatus() });
  const bodyResult = await validateBodyWithSchema({ validator: responseValidator, bodySchema, res });
  return bodyResult;
}
