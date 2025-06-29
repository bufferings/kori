import { type KoriResponse } from '../context/index.js';
import {
  type KoriResponseSchemaDefault,
  type KoriResponseSchemaContentDefault,
  type KoriResponseSchemaValueDefault,
  isKoriSchema,
} from '../schema/index.js';
import { err, type KoriResult } from '../utils/index.js';

import { type KoriResponseValidatorDefault } from './response-validator.js';

function resolveSchemaForStatusCode({
  responseSchema,
  statusCode,
}: {
  responseSchema: KoriResponseSchemaDefault;
  statusCode: number;
}): KoriResponseSchemaValueDefault | undefined {
  const statusCodeStr = statusCode.toString();

  if (statusCodeStr in responseSchema) {
    return responseSchema[statusCodeStr as keyof typeof responseSchema] as KoriResponseSchemaValueDefault;
  }

  const wildcardPattern = `${statusCodeStr[0]}XX`;
  if (wildcardPattern in responseSchema) {
    return responseSchema[wildcardPattern as keyof typeof responseSchema] as KoriResponseSchemaValueDefault;
  }

  if ('default' in responseSchema) {
    return responseSchema.default;
  }

  return undefined;
}

async function validateResponseBody({
  validator,
  schema,
  res,
}: {
  validator: KoriResponseValidatorDefault;
  schema: KoriResponseSchemaValueDefault | undefined;
  res: KoriResponse;
}): Promise<KoriResult<unknown, unknown>> {
  if (!schema) {
    // TODO: Consider
    return err({ message: 'No response schema found for status code' });
  }

  if (isKoriSchema(schema)) {
    // TODO: Consider Content-Types only allows JSON
    const body = res.getBody();
    return validator.validateBody({schema, body});
  }

  const content = (schema.content ?? schema) as KoriResponseSchemaContentDefault;
  const contentType = res.getContentType()?.split(';')[0]?.trim();

  if (!contentType || !(contentType in content)) {
    // TODO: Consider
    return err({ message: 'Unsupported Media Type' });
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const mediaTypeSchema = content[contentType]!;
  const schemaForContentType = isKoriSchema(mediaTypeSchema) ? mediaTypeSchema : mediaTypeSchema.schema;

  const body = res.getBody();
  return validator.validateBody({schema: schemaForContentType, body});
}

export function resolveResponseValidationFunction({
  responseValidator,
  responseSchema,
}: {
  responseValidator?: KoriResponseValidatorDefault;
  responseSchema?: KoriResponseSchemaDefault;
}): ((res: KoriResponse) => Promise<KoriResult<unknown, unknown>>) | undefined {
  if (!responseValidator || !responseSchema) {
    return undefined;
  }

  return async (res) => {
    const schema = resolveSchemaForStatusCode({responseSchema, statusCode: res.getStatus()});
    return validateResponseBody({validator: responseValidator, schema, res});
  };
}
