import { createKori, type Kori } from '@korix/kori';
import * as v from 'valibot';
import { describe, test, expect, vi } from 'vitest';

import { enableStdResponseValidation } from '../../../src/std-enable-validation/index.js';
import { stdResponseSchema } from '../../../src/std-response-schema/index.js';

async function createFetchHandler(app: Kori<any, any, any, any, any>) {
  const handler = app.generate();
  const initializedHandler = await handler.onStart();
  return initializedHandler.fetchHandler;
}

describe('Response validation integration (Valibot)', () => {
  test('validates response data and logs validation failures', async () => {
    const onResponseValidationFailure = vi.fn();

    const app = createKori({
      ...enableStdResponseValidation({ onResponseValidationFailure }),
    }).get('/users/:id', {
      responseSchema: stdResponseSchema({
        200: v.object({
          id: v.string(),
          name: v.string(),
          email: v.pipe(v.string(), v.email()),
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
    const fetchHandler = await createFetchHandler(app);

    const response = await fetchHandler(new Request('http://localhost/users/user-123', { method: 'GET' }));

    // Response validation failure should be logged but response still returned
    expect(onResponseValidationFailure).toHaveBeenCalled();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ id: 'user-123', name: 'John' });
  });

  test('works with default response validation (no custom handler)', async () => {
    const app = createKori({
      ...enableStdResponseValidation(),
    }).get('/health', {
      responseSchema: stdResponseSchema({
        200: v.object({ status: v.string() }),
      }),
      handler: (ctx) => {
        return ctx.res.json({ status: 'ok' });
      },
    });
    const fetchHandler = await createFetchHandler(app);

    const response = await fetchHandler(new Request('http://localhost/health', { method: 'GET' }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: 'ok' });
  });

  test('configures response validator correctly', () => {
    const config = enableStdResponseValidation();

    expect(config.responseValidator).toBeDefined();
    expect(config.responseValidator.provider).toBe('standard-schema');
    expect(config.onResponseValidationFailure).toBeUndefined();
  });
});
