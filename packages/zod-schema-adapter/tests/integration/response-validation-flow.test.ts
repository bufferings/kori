import { createKori } from '@korix/kori';
import { describe, test, expect, vi } from 'vitest';
import { z } from 'zod';

import { enableZodResponseValidation } from '../../src/zod-enable-validation/index.js';
import { zodResponseSchema } from '../../src/zod-response-schema/index.js';

describe('Response validation integration', () => {
  test('validates response data and logs validation failures', async () => {
    const onResponseValidationFailure = vi.fn();

    const app = createKori({
      ...enableZodResponseValidation({ onResponseValidationFailure }),
    }).get('/users/:id', {
      responseSchema: zodResponseSchema({
        200: z.object({
          id: z.string(),
          name: z.string(),
          email: z.email(),
        }),
      }),
      handler: (ctx) => {
        // Intentionally return data that doesn't match the schema
        return ctx.res.json({
          id: 'user-123',
          name: 'John',
          // missing: email
        } as any);
      },
    });
    const { fetchHandler } = await app.generate().onStart();

    const response = await fetchHandler(new Request('http://localhost/users/user-123', { method: 'GET' }));

    // Response validation failure should be logged but response still returned
    expect(onResponseValidationFailure).toHaveBeenCalled();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ id: 'user-123', name: 'John' });
  });

  test('works with default response validation (no custom handler)', async () => {
    const app = createKori({
      ...enableZodResponseValidation(),
    }).get('/health', {
      responseSchema: zodResponseSchema({
        200: z.object({ status: z.string() }),
      }),
      handler: (ctx) => {
        return ctx.res.json({ status: 'ok' });
      },
    });
    const { fetchHandler } = await app.generate().onStart();

    const response = await fetchHandler(new Request('http://localhost/health', { method: 'GET' }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: 'ok' });
  });

  test('configures response validator correctly', () => {
    const config = enableZodResponseValidation();

    expect(config.responseValidator).toBeDefined();
    expect(config.responseValidator.provider).toBe('zod');
    expect(config.onResponseValidationFailure).toBeUndefined();
  });
});
