import { createKori, type Kori } from '@korix/kori';
import { type } from 'arktype';
import { describe, test, expect, vi } from 'vitest';

import { enableStdRequestAndResponseValidation } from '../../../src/std-enable-validation/index.js';
import { stdRequestSchema } from '../../../src/std-request-schema/index.js';
import { stdResponseSchema } from '../../../src/std-response-schema/index.js';

async function createFetchHandler(app: Kori<any, any, any, any, any>) {
  const handler = app.generate();
  const initializedHandler = await handler.onStart();
  return initializedHandler.fetchHandler;
}

describe('Full validation integration (ArkType)', () => {
  test('complete user creation workflow with both validations', async () => {
    const onRequestValidationFailure = vi.fn();
    const onResponseValidationFailure = vi.fn();

    const app = createKori({
      ...enableStdRequestAndResponseValidation({
        onRequestValidationFailure,
        onResponseValidationFailure,
      }),
    }).post('/users', {
      requestSchema: stdRequestSchema({
        body: type({
          name: 'string>=1',
          email: 'string.email',
        }),
      }),
      responseSchema: stdResponseSchema({
        201: type({
          id: 'string',
          name: 'string',
          email: 'string',
          createdAt: 'string',
        }),
        400: type({
          error: {
            type: 'string',
            message: 'string',
          },
        }),
      }),
      handler: (ctx) => {
        const { name, email } = ctx.req.validatedBody();

        return ctx.res.status(201).json({
          id: `user-${Date.now()}`,
          name,
          email,
          createdAt: new Date().toISOString(),
        });
      },
    });
    const fetchHandler = await createFetchHandler(app);

    const response = await fetchHandler(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Alice Smith',
          email: 'alice@example.com',
        }),
      }),
    );

    expect(onRequestValidationFailure).not.toHaveBeenCalled();
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body).toMatchObject({
      name: 'Alice Smith',
      email: 'alice@example.com',
      createdAt: expect.any(String),
    });
  });

  test('handles request validation failure with proper error response', async () => {
    const onRequestValidationFailure = vi.fn((ctx) => {
      return ctx.res.badRequest({ message: 'Invalid user data' });
    });
    const onResponseValidationFailure = vi.fn();

    const app = createKori({
      ...enableStdRequestAndResponseValidation({
        onRequestValidationFailure,
        onResponseValidationFailure,
      }),
    }).put('/users/:id', {
      requestSchema: stdRequestSchema({
        params: type({ id: 'string' }),
        body: type({ name: 'string', email: 'string.email' }),
      }),
      responseSchema: stdResponseSchema({
        200: type({ id: 'string', updated: 'boolean' }),
        400: type({
          error: {
            type: 'string',
            message: 'string',
          },
        }),
      }),
      handler: (ctx) => {
        const { id } = ctx.req.validatedParams();
        const { name } = ctx.req.validatedBody();
        return ctx.res.json({ id, updated: true, name });
      },
    });
    const fetchHandler = await createFetchHandler(app);

    const response = await fetchHandler(
      new Request('http://localhost/users/user-123', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Name',
          email: 'invalid-email-format', // This will cause request validation to fail
        }),
      }),
    );

    expect(onRequestValidationFailure).toHaveBeenCalled();
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toEqual({
      error: {
        type: 'BAD_REQUEST',
        message: 'Invalid user data',
      },
    });
  });

  test('configures both validators correctly', () => {
    const config = enableStdRequestAndResponseValidation();

    expect(config.requestValidator).toBeDefined();
    expect(config.responseValidator).toBeDefined();
    expect(config.requestValidator.provider).toBe('standard-schema');
    expect(config.responseValidator.provider).toBe('standard-schema');
    expect(config.onRequestValidationFailure).toBeUndefined();
    expect(config.onResponseValidationFailure).toBeUndefined();
  });
});
