import { createKori } from '@korix/kori';
import { describe, test, expect, vi } from 'vitest';
import { z } from 'zod';

import { enableStdRequestAndResponseValidation } from '../../../src/std-enable-validation/index.js';
import { stdRequestSchema } from '../../../src/std-request-schema/index.js';
import { stdResponseSchema } from '../../../src/std-response-schema/index.js';

describe('Full validation integration (Zod)', () => {
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
        body: z.object({
          name: z.string().min(1),
          email: z.email(),
        }),
      }),
      responseSchema: stdResponseSchema({
        '201': z.object({
          id: z.string(),
          name: z.string(),
          email: z.string(),
          createdAt: z.string(),
        }),
        '400': z.object({
          error: z.object({
            type: z.string(),
            message: z.string(),
          }),
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
    const { fetchHandler } = await app.generate().onStart();

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
        params: z.object({ id: z.string() }),
        body: z.object({ name: z.string(), email: z.email() }),
      }),
      responseSchema: stdResponseSchema({
        '200': z.object({ id: z.string(), updated: z.boolean(), name: z.string() }),
        '400': z.object({
          error: z.object({
            type: z.string(),
            message: z.string(),
          }),
        }),
      }),
      handler: (ctx) => {
        const { id } = ctx.req.validatedParams();
        const { name } = ctx.req.validatedBody();
        return ctx.res.json({ id, updated: true, name });
      },
    });
    const { fetchHandler } = await app.generate().onStart();

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
