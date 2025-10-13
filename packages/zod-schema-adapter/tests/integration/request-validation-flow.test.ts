import { createKori } from '@korix/kori';
import { describe, test, expect, vi } from 'vitest';
import { z } from 'zod';

import { enableZodRequestValidation } from '../../src/zod-enable-validation/index.js';
import { zodRequestSchema } from '../../src/zod-request-schema/index.js';

describe('Request validation integration', () => {
  test('rejects invalid request data with custom error handler', async () => {
    const onRequestValidationFailure = vi.fn((ctx) => {
      return ctx.res.badRequest({ message: 'Custom validation error' });
    });

    const app = createKori({
      ...enableZodRequestValidation({ onRequestValidationFailure }),
    }).post('/users', {
      requestSchema: zodRequestSchema({
        body: z.object({
          name: z.string().min(1),
          email: z.email(),
          age: z.number().min(18),
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
    const { fetchHandler } = await app.generate().onStart();

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

  test('validates simple body with valid data', async () => {
    const onRequestValidationFailure = vi.fn();

    const app = createKori({
      ...enableZodRequestValidation({ onRequestValidationFailure }),
    }).post('/users', {
      requestSchema: zodRequestSchema({
        body: z.object({ name: z.string(), email: z.email() }),
      }),
      handler: (ctx) => {
        const { name, email } = ctx.req.validatedBody();

        return ctx.res.json({
          success: true,
          user: {
            name,
            email,
          },
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

  test('validates content body with valid data', async () => {
    const onRequestValidationFailure = vi.fn();

    const app = createKori({
      ...enableZodRequestValidation({ onRequestValidationFailure }),
    }).post('/users', {
      requestSchema: zodRequestSchema({
        body: {
          content: {
            'application/json': z.object({ name: z.string(), email: z.email() }),
          },
        },
      }),
      handler: (ctx) => {
        const body = ctx.req.validatedBody();
        if (body.mediaType === 'application/json') {
          const { name, email } = body.value;
          return ctx.res.json({
            success: true,
            user: {
              name,
              email,
            },
          });
        } else {
          expect.fail('Invalid media type');
        }
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
      ...enableZodRequestValidation(),
    }).post('/users', {
      requestSchema: zodRequestSchema({
        body: z.object({ name: z.string() }),
      }),
      handler: (ctx) => {
        return ctx.res.json({ success: true });
      },
    });
    const { fetchHandler } = await app.generate().onStart();

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
