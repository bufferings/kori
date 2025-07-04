import { type KoriRequest } from '../context/index.js';
import { type KoriRequestSchemaDefault, type KoriRequestSchemaContentDefault, isKoriSchema } from '../schema/index.js';
import { ok, err, type KoriResult } from '../util/index.js';

import {
  type KoriRequestValidationError,
  type KoriFieldValidationError,
  type KoriBodyValidationError,
} from './request-validation-error.js';
import { type KoriRequestValidatorDefault } from './request-validator.js';

async function validateRequestParams({
  validator,
  schema,
  req,
}: {
  validator: KoriRequestValidatorDefault;
  schema: KoriRequestSchemaDefault['params'];
  req: KoriRequest;
}): Promise<KoriResult<unknown, KoriFieldValidationError<unknown>>> {
  if (!schema) {
    return ok(undefined);
  }

  const result = await validator.validateParams({ schema, params: req.pathParams });
  if (result.ok) {
    return result;
  }

  return err({
    stage: 'validation',
    error: result.error,
  });
}

async function validateRequestQueries({
  validator,
  schema,
  req,
}: {
  validator: KoriRequestValidatorDefault;
  schema: KoriRequestSchemaDefault['queries'];
  req: KoriRequest;
}): Promise<KoriResult<unknown, KoriFieldValidationError<unknown>>> {
  if (!schema) {
    return ok(undefined);
  }

  const result = await validator.validateQueries({ schema, queries: req.queryParams });
  if (result.ok) {
    return result;
  }

  return err({
    stage: 'validation',
    error: result.error,
  });
}

async function validateRequestHeaders({
  validator,
  schema,
  req,
}: {
  validator: KoriRequestValidatorDefault;
  schema: KoriRequestSchemaDefault['headers'];
  req: KoriRequest;
}): Promise<KoriResult<unknown, KoriFieldValidationError<unknown>>> {
  if (!schema) {
    return ok(undefined);
  }

  const result = await validator.validateHeaders({ schema, headers: req.headers });
  if (result.ok) {
    return result;
  }

  return err({
    stage: 'validation',
    error: result.error,
  });
}

async function validateRequestBody({
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

  if (isKoriSchema(schema)) {
    try {
      const body = await req.json();
      const result = await validator.validateBody({ schema, body });
      if (result.ok) {
        return result;
      }

      return err({
        stage: 'validation',
        error: result.error,
      });
    } catch (error) {
      return err({
        stage: 'pre-validation',
        type: 'INVALID_JSON',
        message: 'Failed to parse request body as JSON',
        cause: error,
      });
    }
  }

  const content = (schema.content ?? schema) as KoriRequestSchemaContentDefault;
  const contentType = req.headers['content-type']?.split(';')[0]?.trim();

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
  const schemaForContentType = isKoriSchema(mediaTypeSchema) ? mediaTypeSchema : mediaTypeSchema.schema;

  try {
    const body = await req.json();
    const result = await validator.validateBody({ schema: schemaForContentType, body });
    if (result.ok) {
      return ok({ contentType, data: result.value });
    }

    return err({
      stage: 'validation',
      error: result.error,
    });
  } catch (error) {
    return err({
      stage: 'pre-validation',
      type: 'INVALID_JSON',
      message: `Failed to parse request body as ${contentType}`,
      cause: error,
    });
  }
}

export function resolveRequestValidationFunction({
  requestValidator,
  requestSchema,
}: {
  requestValidator?: KoriRequestValidatorDefault;
  requestSchema?: KoriRequestSchemaDefault;
}): ((req: KoriRequest) => Promise<KoriResult<unknown, KoriRequestValidationError>>) | undefined {
  if (!requestValidator || !requestSchema) {
    return undefined;
  }

  return async (req) => {
    const { body: bodySchema, params: paramsSchema, queries: queriesSchema, headers: headersSchema } = requestSchema;

    const [paramsResult, queriesResult, headersResult, bodyResult] = await Promise.all([
      validateRequestParams({ validator: requestValidator, schema: paramsSchema, req }),
      validateRequestQueries({ validator: requestValidator, schema: queriesSchema, req }),
      validateRequestHeaders({ validator: requestValidator, schema: headersSchema, req }),
      validateRequestBody({ validator: requestValidator, schema: bodySchema, req }),
    ]);

    if (paramsResult.ok && queriesResult.ok && headersResult.ok && bodyResult.ok) {
      return ok({
        params: paramsResult.value,
        queries: queriesResult.value,
        headers: headersResult.value,
        body: bodyResult.value,
      });
    }

    const errors: KoriRequestValidationError<unknown> = {};
    if (!paramsResult.ok) errors.params = paramsResult.error;
    if (!queriesResult.ok) errors.queries = queriesResult.error;
    if (!headersResult.ok) errors.headers = headersResult.error;
    if (!bodyResult.ok) errors.body = bodyResult.error;
    return err(errors);
  };
}
