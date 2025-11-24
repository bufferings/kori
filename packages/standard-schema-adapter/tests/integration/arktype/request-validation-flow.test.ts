import { createKori } from '@korix/kori';
import { type } from 'arktype';
import { describe, test, expect, vi } from 'vitest';

import { enableStdRequestValidation } from '../../../src/std-enable-validation/index.js';
import { stdRequestSchema } from '../../../src/std-request-schema/index.js';

describe('Request validation integration (ArkType)', () => {
  test('rejects invalid request data with custom error handler', async () => {
    const onRequestValidationFailure = vi.fn((ctx) => {
      return ctx.res.badRequest({ message: 'Custom validation error' });
    });

    const app = createKori({
      ...enableStdRequestValidation({ onRequestValidationFailure }),
    }).post('/users', {
      requestSchema: stdRequestSchema({
        body: type({
          name: 'string>=1',
          email: 'string.email',
          age: 'number>=18',
        }),
      }),
      handler: (ctx) => {
        const { name, email, age } = ctx.req.validatedBody();
        return ctx.res.json({
          id: 'user-123',
          name,
          email,
          age,
          created: true,
        });
      },
    });
    const { fetchHandler } = await app.start();

    const response = await fetchHandler(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: '', // invalid: too short
          email: 'not-email', // invalid: not email format
          age: 16, // invalid: too young
        }),
      }),
    );

    expect(onRequestValidationFailure).toHaveBeenCalled();
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toEqual({
      error: {
        type: 'BAD_REQUEST',
        message: 'Custom validation error',
      },
    });
  });

  test('processes valid request data through complete workflow', async () => {
    const onRequestValidationFailure = vi.fn();

    const app = createKori({
      ...enableStdRequestValidation({ onRequestValidationFailure }),
    }).post('/users', {
      requestSchema: stdRequestSchema({
        body: type({ name: 'string', email: 'string.email' }),
      }),
      handler: (ctx) => {
        const body = ctx.req.validatedBody();

        return ctx.res.json({
          success: true,
          user: body,
        });
      },
    });
    const { fetchHandler } = await app.start();

    const response = await fetchHandler(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
        }),
      }),
    );

    expect(onRequestValidationFailure).not.toHaveBeenCalled();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({
      success: true,
      user: {
        name: 'John Doe',
        email: 'john@example.com',
      },
    });
  });

  test('uses default error handler when no custom handler provided', async () => {
    const app = createKori({
      ...enableStdRequestValidation(),
    }).post('/users', {
      requestSchema: stdRequestSchema({
        body: type({ name: 'string' }),
      }),
      handler: (ctx) => {
        return ctx.res.json({ success: true });
      },
    });
    const { fetchHandler } = await app.start();

    const response = await fetchHandler(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 123 }), // invalid type
      }),
    );

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toEqual({
      error: {
        type: 'BAD_REQUEST',
        message: 'Request validation failed',
      },
    });
  });
});
