import { type KoriRequest } from '../context/index.js';
import { type KoriRequestSchemaDefault, type KoriRequestSchemaContentDefault, isKoriSchema } from '../schema/index.js';
import { ok, err, type KoriResult } from '../utils/index.js';

import { type KoriRequestValidatorDefault } from './request-validator.js';

function validateRequestParams({
  validator,
  schema,
  req,
}: {
  validator: KoriRequestValidatorDefault;
  schema: KoriRequestSchemaDefault['params'];
  req: KoriRequest;
}) {
  return schema ? validator.validateParams({schema, params: req.pathParams}) : Promise.resolve(ok(undefined));
}

function validateRequestQueries({
  validator,
  schema,
  req,
}: {
  validator: KoriRequestValidatorDefault;
  schema: KoriRequestSchemaDefault['queries'];
  req: KoriRequest;
}) {
  return schema ? validator.validateQueries({schema, queries: req.queryParams}) : Promise.resolve(ok(undefined));
}

function validateRequestHeaders({
  validator,
  schema,
  req,
}: {
  validator: KoriRequestValidatorDefault;
  schema: KoriRequestSchemaDefault['headers'];
  req: KoriRequest;
}) {
  return schema ? validator.validateHeaders({schema, headers: req.headers}) : Promise.resolve(ok(undefined));
}

async function validateRequestBody({
  validator,
  schema,
  req,
}: {
  validator: KoriRequestValidatorDefault;
  schema: KoriRequestSchemaDefault['body'];
  req: KoriRequest;
}): Promise<KoriResult<unknown, unknown>> {
  if (!schema) {
    return ok(undefined);
  }

  if (isKoriSchema(schema)) {
    // TODO: Consider Content-Types other than JSON
    const body = await req.json();
    return validator.validateBody({schema, body});
  }

  const content = (schema.content ?? schema) as KoriRequestSchemaContentDefault;
  const contentType = req.headers['content-type']?.split(';')[0]?.trim();

  if (!contentType || !(contentType in content)) {
    // TODO: Consider 415
    return err({ message: 'Unsupported Media Type' });
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const mediaTypeSchema = content[contentType]!;
  const schemaForContentType = isKoriSchema(mediaTypeSchema) ? mediaTypeSchema : mediaTypeSchema.schema;

  // TODO: Consider Content-Types other than JSON
  const body = await req.json();
  const result = await validator.validateBody({schema: schemaForContentType, body});

  return result.ok ? ok({ type: contentType, data: result.value }) : result;
}

export function resolveRequestValidationFunction({
  requestValidator,
  requestSchema,
}: {
  requestValidator?: KoriRequestValidatorDefault;
  requestSchema?: KoriRequestSchemaDefault;
}): ((req: KoriRequest) => Promise<KoriResult<unknown, unknown>>) | undefined {
  if (!requestValidator || !requestSchema) {
    return undefined;
  }

  return async (req) => {
    const { body: bodySchema, params: paramsSchema, queries: queriesSchema, headers: headersSchema } = requestSchema;

    const [paramsResult, queriesResult, headersResult, bodyResult] = await Promise.all([
      validateRequestParams({validator: requestValidator, schema: paramsSchema, req}),
      validateRequestQueries({validator: requestValidator, schema: queriesSchema, req}),
      validateRequestHeaders({validator: requestValidator, schema: headersSchema, req}),
      validateRequestBody({validator: requestValidator, schema: bodySchema, req}),
    ]);

    if (paramsResult.ok && queriesResult.ok && headersResult.ok && bodyResult.ok) {
      return ok({
        params: paramsResult.value,
        queries: queriesResult.value,
        headers: headersResult.value,
        body: bodyResult.value,
      });
    }

    return err({
      params: paramsResult.ok ? undefined : paramsResult.error,
      queries: queriesResult.ok ? undefined : queriesResult.error,
      headers: headersResult.ok ? undefined : headersResult.error,
      body: bodyResult.ok ? undefined : bodyResult.error,
    });
  };
}
