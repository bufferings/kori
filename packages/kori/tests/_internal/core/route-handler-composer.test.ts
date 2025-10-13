import { describe, test, expect, vi } from 'vitest';

import { createKoriHandlerContext, createKoriRequest, createKoriResponse } from '../../../src/context/index.js';
import { createKoriRequestSchema } from '../../../src/request-schema/index.js';
import { createKoriResponseSchema } from '../../../src/response-schema/index.js';
import { createKoriSchema } from '../../../src/schema/index.js';
import { fail, succeed } from '../../../src/util/index.js';
import { createKoriValidator } from '../../../src/validator/index.js';

import { composeRouteHandler } from '../../../src/_internal/core/route-handler-composer.js';
import { createKoriLoggerFactory } from '../../../src/logging/logger-factory.js';

// Test validators and schemas
const testProvider = 'test';

const paramsSchema = createKoriSchema({
  provider: testProvider,
  definition: { type: 'params' },
});

const queriesSchema = createKoriSchema({
  provider: testProvider,
  definition: { type: 'queries' },
});

const headersSchema = createKoriSchema({
  provider: testProvider,
  definition: { type: 'headers' },
});

const bodySchema = createKoriSchema({
  provider: testProvider,
  definition: { type: 'body' },
});

const testRequestValidator = createKoriValidator({
  provider: testProvider,
  validate: ({ schema, value }): any => {
    const schemaType = (schema as any).definition.type;

    switch (schemaType) {
      case 'params':
        return succeed({ ...(value as any), __validated: 'params' });
      case 'queries':
        return succeed({ ...(value as any), __validated: 'queries' });
      case 'headers':
        return succeed({ ...(value as any), __validated: 'headers' });
      case 'body':
        if (value === 'invalid') {
          return fail({ stage: 'validation', reason: { message: 'invalid body' } });
        }
        return succeed({ ...(value as any), __validated: 'body' });
      default:
        return fail(`Unknown schema type: ${schemaType}`);
    }
  },
});

const testRequestSchema = createKoriRequestSchema({
  provider: testProvider,
  params: paramsSchema,
  queries: queriesSchema,
  headers: headersSchema,
  body: bodySchema,
});

const testResponseValidator = createKoriValidator({
  provider: testProvider,
  validate: ({ value }) => {
    if (value === 'invalid') {
      return fail({ stage: 'validation', reason: { message: 'invalid response' } });
    }
    return succeed(value as any);
  },
});

const testResponseSchema = createKoriResponseSchema({
  provider: testProvider,
  responses: {
    '200': createKoriSchema({ provider: testProvider, definition: {} }) as any,
  },
});

// Test helpers
function createMockContext() {
  const loggerFactory = createKoriLoggerFactory();
  const req = createKoriRequest({ rawRequest: new Request('http://localhost/'), pathParams: {}, pathTemplate: '/' });
  return createKoriHandlerContext({ env: {} as any, req, res: createKoriResponse(req), loggerFactory });
}

function createMockContextWithBody(body: any) {
  const loggerFactory = createKoriLoggerFactory();
  const request = new Request('http://localhost/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const req = createKoriRequest({ rawRequest: request, pathParams: {}, pathTemplate: '/' });
  return createKoriHandlerContext({ env: {} as any, req, res: createKoriResponse(req), loggerFactory });
}

function createMockContextWithoutContentType() {
  const loggerFactory = createKoriLoggerFactory();
  const request = new Request('http://localhost/', { method: 'POST', body: 'some body' });
  const req = createKoriRequest({ rawRequest: request, pathParams: {}, pathTemplate: '/' });
  return createKoriHandlerContext({ env: {} as any, req, res: createKoriResponse(req), loggerFactory });
}

function createInstanceOptions(overrides = {}) {
  return {
    requestHooks: [],
    errorHooks: [],
    requestValidator: undefined,
    responseValidator: undefined,
    instanceOnRequestValidationFailure: undefined,
    instanceOnResponseValidationFailure: undefined,
    ...overrides,
  };
}

function createRouteOptions(overrides = {}) {
  return {
    requestSchema: undefined,
    responseSchema: undefined,
    handler: (ctx: any) => ctx.res.empty(),
    routeOnRequestValidationFailure: undefined,
    routeOnResponseValidationFailure: undefined,
    ...overrides,
  };
}

describe('composeRouteHandler', () => {
  describe('basic handler execution', () => {
    test('executes handler normally when no hooks/validation', async () => {
      const handler = vi.fn((ctx: any) => ctx.res.json({ ok: true }));

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions(),
        routeOptions: createRouteOptions({ handler }),
      });

      const ctx = createMockContext();
      const res = await composed(ctx as any);

      expect(res.getStatus()).toBe(200);
      expect(res.getContentType()).toBe('application/json; charset=utf-8');
      expect(res.getBody()).toEqual({ ok: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('request hooks', () => {
    test('executes in order and short-circuits on KoriResponse', async () => {
      const order: string[] = [];
      const requestHook1 = vi.fn((ctx: any) => {
        order.push('h1');
        return ctx;
      });
      const requestHook2 = vi.fn((ctx: any) => {
        order.push('h2');
        return ctx.res.text('early');
      });
      const requestHook3 = vi.fn((ctx: any) => {
        order.push('h3');
        return ctx;
      });
      const handler = vi.fn((ctx: any) => ctx.res.text('should-not-run'));

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions({ requestHooks: [requestHook1, requestHook2, requestHook3] }),
        routeOptions: createRouteOptions({ handler }),
      });

      const ctx = createMockContext();
      const res = await composed(ctx as any);

      expect(await res.build().text()).toBe('early');
      expect(order).toEqual(['h1', 'h2']);
      expect(requestHook3).not.toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('defer callbacks', () => {
    test('executes in LIFO order', async () => {
      const order: string[] = [];
      const requestHook1 = vi.fn((ctx: any) => {
        order.push('h1');
        ctx.defer(() => {
          order.push('defer-1');
        });
        return ctx;
      });
      const requestHook2 = vi.fn((ctx: any) => {
        order.push('h2');
        ctx.defer(() => {
          order.push('defer-2');
        });
        return ctx.res.text('early');
      });
      const requestHook3 = vi.fn((ctx: any) => {
        order.push('h3');
        ctx.defer(() => {
          order.push('defer-3'); // This should NOT execute (hook not called)
        });
        return ctx;
      });

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions({ requestHooks: [requestHook1, requestHook2, requestHook3] }),
        routeOptions: createRouteOptions({ handler: vi.fn() }),
      });

      const ctx = createMockContext();
      const res = await composed(ctx as any);

      expect(await res.build().text()).toBe('early');
      expect(order).toEqual(['h1', 'h2', 'defer-2', 'defer-1']);
      expect(requestHook3).not.toHaveBeenCalled();
    });

    test('executes despite handler errors', async () => {
      const handler = () => {
        throw new Error('boom');
      };

      const order: string[] = [];
      const requestHook1 = vi.fn((ctx: any) => {
        ctx.defer(() => {
          order.push('defer-1');
        });
        return ctx;
      });
      const requestHook2 = vi.fn((ctx: any) => {
        ctx.defer(() => {
          order.push('defer-2');
        });
        return ctx;
      });

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions({
          requestHooks: [requestHook1, requestHook2],
        }),
        routeOptions: createRouteOptions({ handler }),
      });

      const ctx = createMockContext();
      const res = await composed(ctx as any);

      expect(res.getStatus()).toBe(500);
      expect(order).toEqual(['defer-2', 'defer-1']);
    });

    test('continues executing when defer callback throws', async () => {
      const handler = vi.fn((ctx: any) => ctx.res.json({ ok: true }));
      const order: string[] = [];

      const requestHook1 = vi.fn((ctx: any) => {
        ctx.defer(() => {
          order.push('defer-1');
        });
        return ctx;
      });

      const requestHook2 = vi.fn((ctx: any) => {
        ctx.defer(() => {
          throw new Error('defer error');
        });
        return ctx;
      });

      const requestHook3 = vi.fn((ctx: any) => {
        ctx.defer(() => {
          order.push('defer-3');
        });
        return ctx;
      });

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions({ requestHooks: [requestHook1, requestHook2, requestHook3] }),
        routeOptions: createRouteOptions({ handler }),
      });

      const ctx = createMockContext();
      const res = await composed(ctx as any);

      expect(res.getStatus()).toBe(200);
      expect(order).toEqual(['defer-3', 'defer-1']);
    });

    test('executes even when error hooks fail', async () => {
      const errorHook = vi.fn(() => {
        throw new Error('error hook failed');
      });
      const handler = () => {
        throw new Error('boom');
      };
      const order: string[] = [];

      const requestHook1 = vi.fn((ctx: any) => {
        ctx.defer(() => {
          order.push('defer-1');
        });
        return ctx;
      });

      const requestHook2 = vi.fn((ctx: any) => {
        ctx.defer(() => {
          order.push('defer-2');
        });
        return ctx;
      });

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions({
          requestHooks: [requestHook1, requestHook2],
          errorHooks: [errorHook],
        }),
        routeOptions: createRouteOptions({ handler }),
      });

      const ctx = createMockContext();
      const res = await composed(ctx as any);

      expect(errorHook).toHaveBeenCalled();
      expect(res.getStatus()).toBe(500);
      expect(order).toEqual(['defer-2', 'defer-1']);
    });
  });

  describe('request validation success', () => {
    test('provides validated data to handler', async () => {
      const handler = vi.fn((ctx: any) => {
        return ctx.res.json({
          body: ctx.req.validatedBody(),
          params: ctx.req.validatedParams(),
          queries: ctx.req.validatedQueries(),
          headers: ctx.req.validatedHeaders(),
        });
      });

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions({ requestValidator: testRequestValidator }),
        routeOptions: createRouteOptions({
          handler,
          requestSchema: testRequestSchema,
        }),
      });

      const ctx = createMockContextWithBody({ test: 'data' });
      const res = await composed(ctx as any);

      expect(res.getStatus()).toBe(200);
      expect(handler).toHaveBeenCalledTimes(1);

      const responseBody = res.getBody() as any;
      expect(responseBody.body).toEqual({ test: 'data', __validated: 'body' });
      expect(responseBody.params).toEqual({ __validated: 'params' });
      expect(responseBody.queries).toEqual({ __validated: 'queries' });
      expect(responseBody.headers).toEqual(expect.objectContaining({ __validated: 'headers' }));
    });
  });

  describe('request validation failure handlers', () => {
    test('stops early at route handler', async () => {
      const handler = vi.fn((ctx: any) => ctx.res.json({ ok: true }));
      const routeOnFail = vi.fn((ctx: any) => ctx.res.badRequest({ message: 'route handled' }));
      const instanceOnFail = vi.fn(() => undefined);

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions({
          requestValidator: testRequestValidator,
          instanceOnRequestValidationFailure: instanceOnFail,
        }),
        routeOptions: createRouteOptions({
          handler,
          requestSchema: testRequestSchema,
          routeOnRequestValidationFailure: routeOnFail,
        }),
      });

      const ctx = createMockContextWithBody('invalid');
      const res = await composed(ctx as any);

      expect(routeOnFail).toHaveBeenCalledTimes(1);
      expect(instanceOnFail).not.toHaveBeenCalled();
      expect(res.getStatus()).toBe(400);
      expect((res.getBody() as any).error.message).toBe('route handled');
      expect(handler).not.toHaveBeenCalled();
    });

    test('stops early at instance handler', async () => {
      const handler = vi.fn((ctx: any) => ctx.res.json({ ok: true }));
      const routeOnFail = vi.fn(() => undefined);
      const instanceOnFail = vi.fn((ctx: any) => ctx.res.badRequest({ message: 'instance handled' }));

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions({
          requestValidator: testRequestValidator,
          instanceOnRequestValidationFailure: instanceOnFail,
        }),
        routeOptions: createRouteOptions({
          handler,
          requestSchema: testRequestSchema,
          routeOnRequestValidationFailure: routeOnFail,
        }),
      });

      const ctx = createMockContextWithBody('invalid');
      const res = await composed(ctx as any);

      expect(routeOnFail).toHaveBeenCalledTimes(1);
      expect(instanceOnFail).toHaveBeenCalledTimes(1);
      expect(res.getStatus()).toBe(400);
      expect((res.getBody() as any).error.message).toBe('instance handled');
      expect(handler).not.toHaveBeenCalled();
    });

    test('cascades through all handlers to fallback', async () => {
      const handler = vi.fn((ctx: any) => ctx.res.json({ ok: true }));
      const routeOnFail = vi.fn(() => undefined);
      const instanceOnFail = vi.fn(() => undefined);

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions({
          requestValidator: testRequestValidator,
          instanceOnRequestValidationFailure: instanceOnFail,
        }),
        routeOptions: createRouteOptions({
          handler,
          requestSchema: testRequestSchema,
          routeOnRequestValidationFailure: routeOnFail,
        }),
      });

      const ctx = createMockContextWithBody('invalid');
      const res = await composed(ctx as any);

      expect(routeOnFail).toHaveBeenCalledTimes(1);
      expect(instanceOnFail).toHaveBeenCalledTimes(1);
      expect(res.getStatus()).toBe(400);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('request validation fallback responses', () => {
    test('returns 400 for validation errors', async () => {
      const handler = vi.fn((ctx: any) => ctx.res.json({ ok: true }));

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions({ requestValidator: testRequestValidator }),
        routeOptions: createRouteOptions({
          handler,
          requestSchema: testRequestSchema,
        }),
      });

      const ctx = createMockContextWithBody('invalid');
      const res = await composed(ctx as any);

      expect(res.getStatus()).toBe(400);
      expect(handler).not.toHaveBeenCalled();
    });

    test('returns 415 for unsupported media type', async () => {
      const handler = vi.fn((ctx: any) => ctx.res.json({ ok: true }));

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions({ requestValidator: testRequestValidator }),
        routeOptions: createRouteOptions({
          handler,
          requestSchema: testRequestSchema,
        }),
      });

      const ctx = createMockContextWithoutContentType();
      const res = await composed(ctx as any);

      expect(res.getStatus()).toBe(415);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('response validation success', () => {
    test('validates response successfully', async () => {
      const validateFn = vi.fn(({ value }) => succeed(value));

      const successValidator = createKoriValidator({
        provider: testProvider,
        validate: validateFn,
      });

      const handler = vi.fn((ctx: any) => ctx.res.json({ ok: true }));

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions({ responseValidator: successValidator }),
        routeOptions: createRouteOptions({
          handler,
          responseSchema: testResponseSchema,
        }),
      });

      const ctx = createMockContext();
      const res = await composed(ctx as any);

      expect(res.getStatus()).toBe(200);
      expect(validateFn).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('response validation failure handlers', () => {
    test('stops early at route handler', async () => {
      const handler = vi.fn((ctx: any) => ctx.res.text('invalid'));
      const routeOnFail = vi.fn((ctx: any) => ctx.res.badRequest({ message: 'route handled response failure' }));
      const instanceOnFail = vi.fn(() => undefined);

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions({
          responseValidator: testResponseValidator,
          instanceOnResponseValidationFailure: instanceOnFail,
        }),
        routeOptions: createRouteOptions({
          handler,
          responseSchema: testResponseSchema,
          routeOnResponseValidationFailure: routeOnFail,
        }),
      });

      const ctx = createMockContext();
      const res = await composed(ctx as any);

      expect(routeOnFail).toHaveBeenCalledTimes(1);
      expect(instanceOnFail).not.toHaveBeenCalled();
      expect(res.getStatus()).toBe(400);
      expect((res.getBody() as any).error.message).toBe('route handled response failure');
    });

    test('stops early at instance handler', async () => {
      const handler = vi.fn((ctx: any) => ctx.res.text('invalid'));
      const routeOnFail = vi.fn(() => undefined);
      const instanceOnFail = vi.fn((ctx: any) => ctx.res.badRequest({ message: 'instance handled response failure' }));

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions({
          responseValidator: testResponseValidator,
          instanceOnResponseValidationFailure: instanceOnFail,
        }),
        routeOptions: createRouteOptions({
          handler,
          responseSchema: testResponseSchema,
          routeOnResponseValidationFailure: routeOnFail,
        }),
      });

      const ctx = createMockContext();
      const res = await composed(ctx as any);

      expect(routeOnFail).toHaveBeenCalledTimes(1);
      expect(instanceOnFail).toHaveBeenCalledTimes(1);
      expect(res.getStatus()).toBe(400);
      expect((res.getBody() as any).error.message).toBe('instance handled response failure');
    });

    test('cascades through all handlers to fallback', async () => {
      const handler = vi.fn((ctx: any) => ctx.res.text('invalid'));
      const routeOnFail = vi.fn(() => undefined);
      const instanceOnFail = vi.fn(() => undefined);

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions({
          responseValidator: testResponseValidator,
          instanceOnResponseValidationFailure: instanceOnFail,
        }),
        routeOptions: createRouteOptions({
          handler,
          responseSchema: testResponseSchema,
          routeOnResponseValidationFailure: routeOnFail,
        }),
      });

      const ctx = createMockContext();
      const res = await composed(ctx as any);

      expect(routeOnFail).toHaveBeenCalledTimes(1);
      expect(instanceOnFail).toHaveBeenCalledTimes(1);
      expect(res.getStatus()).toBe(200);
      expect(await res.build().text()).toBe('invalid');
    });
  });

  describe('response validation fallback behavior', () => {
    test('returns original response when no handlers process failure', async () => {
      const handler = vi.fn((ctx: any) => ctx.res.text('original'));

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions({ responseValidator: testResponseValidator }),
        routeOptions: createRouteOptions({
          handler,
          responseSchema: testResponseSchema,
        }),
      });

      const ctx = createMockContext();
      const res = await composed(ctx as any);

      expect(res.getStatus()).toBe(200);
      expect(await res.build().text()).toBe('original');
    });
  });

  describe('error hooks', () => {
    test('stops early when error hook returns Response', async () => {
      const errorHook1 = vi.fn(() => undefined);
      const errorHook2 = vi.fn((ctx: any) => ctx.res.badRequest({ message: 'handled by hook2' }));
      const errorHook3 = vi.fn(() => undefined);
      const handler = () => {
        throw new Error('boom');
      };

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions({ errorHooks: [errorHook1, errorHook2, errorHook3] }),
        routeOptions: createRouteOptions({ handler }),
      });

      const ctx = createMockContext();
      const res = await composed(ctx as any);

      expect(errorHook1).toHaveBeenCalledTimes(1);
      expect(errorHook2).toHaveBeenCalledTimes(1);
      expect(errorHook3).not.toHaveBeenCalled();
      expect(res.getStatus()).toBe(400);
      expect((res.getBody() as any).error.message).toBe('handled by hook2');
    });

    test('falls back to 500 when no error hook handles', async () => {
      const errorHook = vi.fn(() => undefined);
      const handler = () => {
        throw new Error('boom');
      };

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions({ errorHooks: [errorHook] }),
        routeOptions: createRouteOptions({ handler }),
      });

      const ctx = createMockContext();
      const res = await composed(ctx as any);

      expect(errorHook).toHaveBeenCalled();
      expect(res.getStatus()).toBe(500);
    });

    test('continues to next error hook when one throws', async () => {
      const errorHook1 = vi.fn(() => {
        throw new Error('hook1 error');
      });
      const errorHook2 = vi.fn((ctx: any) => ctx.res.badRequest({ message: 'recovered by hook2' }));
      const errorHook3 = vi.fn(() => undefined);
      const handler = () => {
        throw new Error('boom');
      };

      const composed = composeRouteHandler({
        instanceOptions: createInstanceOptions({ errorHooks: [errorHook1, errorHook2, errorHook3] }),
        routeOptions: createRouteOptions({ handler }),
      });

      const ctx = createMockContext();
      const res = await composed(ctx as any);

      expect(errorHook1).toHaveBeenCalledTimes(1);
      expect(errorHook2).toHaveBeenCalledTimes(1);
      expect(errorHook3).not.toHaveBeenCalled();
      expect(res.getStatus()).toBe(400);
      expect((res.getBody() as any).error.message).toBe('recovered by hook2');
    });
  });
});
