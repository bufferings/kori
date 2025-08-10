import { describe, test, expect, expectTypeOf } from 'vitest';

import { executeHandlerDeferredCallbacks } from '../../src/context/handler-context.js';
import { type KoriResponse } from '../../src/context/response.js';
import { createTestHandlerContext } from '../test-utils.js';

describe('KoriHandlerContext contract', () => {
  describe('withReq', () => {
    test('extends request with additional properties', () => {
      const { ctx } = createTestHandlerContext();

      const extendedCtx = ctx.withReq({ userId: 'u1', isAuthenticated: true });

      expect(extendedCtx.req.userId).toBe('u1');
      expect(extendedCtx.req.isAuthenticated).toBe(true);
    });

    test('extends request type correctly', () => {
      const { ctx } = createTestHandlerContext();

      const extendedCtx = ctx.withReq({ userId: 'u1', isAuthenticated: true });

      // Positive type assertions - extended properties are available
      expectTypeOf(extendedCtx.req.userId).toEqualTypeOf<string>();
      expectTypeOf(extendedCtx.req.isAuthenticated).toEqualTypeOf<boolean>();

      // Original methods are preserved
      expectTypeOf(extendedCtx.req.method).toBeFunction();
      expectTypeOf(extendedCtx.req.url).toBeFunction();

      // @ts-expect-error - userId should not exist on original context
      expectTypeOf(ctx.req.userId).toBeAny();
    });
  });

  describe('withRes', () => {
    test('extends response with additional methods', () => {
      const { ctx } = createTestHandlerContext();

      const extendedCtx = ctx.withRes({ ok: (data: unknown) => ctx.res.json({ ok: true, data }) });

      const response = extendedCtx.res.ok({ message: 'success' });
      const bodyString = response.getBody() as string;
      const bodyObj = JSON.parse(bodyString);
      expect(bodyObj).toEqual({ ok: true, data: { message: 'success' } });
    });

    test('extends response type correctly', () => {
      const { ctx } = createTestHandlerContext();

      const extendedCtx = ctx.withRes({
        success: <T>(data: T) => ctx.res.json({ success: true, data }),
        apiError: (message: string, code: number) => ctx.res.json({ error: message, code }),
      });

      // Extended methods have correct signatures
      expectTypeOf(extendedCtx.res.success).parameters.toEqualTypeOf<[unknown]>();
      expectTypeOf(extendedCtx.res.success).returns.toEqualTypeOf<KoriResponse>();
      expectTypeOf(extendedCtx.res.apiError).parameters.toEqualTypeOf<[string, number]>();

      // Original methods are preserved
      expectTypeOf(extendedCtx.res.json).toBeFunction();

      // @ts-expect-error - success should not exist on original context
      expectTypeOf(ctx.res.success).toBeAny();
    });
  });

  describe('chaining', () => {
    test('withReq and withRes support method chaining', () => {
      const { ctx } = createTestHandlerContext();

      const chainedCtx = ctx.withReq({ userId: 'u1' }).withRes({ success: () => ctx.res.json({ success: true }) });

      expect(chainedCtx.req.userId).toBe('u1');
      expect(typeof chainedCtx.res.success).toBe('function');
    });

    test('supports chaining with correct type evolution', () => {
      const { ctx } = createTestHandlerContext();

      const chainedCtx = ctx
        .withReq({ userId: 'u1', role: 'admin' as const })
        .withRes({ ok: () => ctx.res.json({ ok: true }) })
        .withReq({ sessionId: 'session-123' });

      // All properties from all extensions are available
      expectTypeOf(chainedCtx.req.userId).toEqualTypeOf<string>();
      expectTypeOf(chainedCtx.req.role).toEqualTypeOf<'admin'>();
      expectTypeOf(chainedCtx.req.sessionId).toEqualTypeOf<string>();
      expectTypeOf(chainedCtx.res.ok).toBeFunction();

      // Verify the context maintains its core structure while extending types
      expectTypeOf(chainedCtx.withReq).toBeFunction();
      expectTypeOf(chainedCtx.req).toHaveProperty('userId');
      expectTypeOf(chainedCtx.req).toHaveProperty('role');
      expectTypeOf(chainedCtx.req).toHaveProperty('sessionId');
      expectTypeOf(chainedCtx.res).toHaveProperty('ok');
    });

    test('works with complex types', () => {
      const { ctx } = createTestHandlerContext();

      type AuthUser = { id: string; permissions: string[] };
      type ApiResponse<T> = { data: T; meta: { timestamp: number } };

      const complexCtx = ctx.withReq({ user: { id: 'u1', permissions: ['read', 'write'] } as AuthUser }).withRes({
        apiSuccess: <T>(data: T): KoriResponse =>
          ctx.res.json({ data, meta: { timestamp: Date.now() } } as ApiResponse<T>),
      });

      expectTypeOf(complexCtx.req.user).toEqualTypeOf<AuthUser>();
      expectTypeOf(complexCtx.req.user.permissions).toEqualTypeOf<string[]>();
      expectTypeOf(complexCtx.res.apiSuccess).parameters.toEqualTypeOf<[unknown]>();
      expectTypeOf(complexCtx.res.apiSuccess).returns.toEqualTypeOf<KoriResponse>();
    });
  });

  describe('defer', () => {
    test('executes callbacks in LIFO order', async () => {
      const { ctx } = createTestHandlerContext();
      const order: number[] = [];

      ctx.defer(() => {
        order.push(1);
      });
      ctx.defer(() => {
        order.push(2);
      });
      ctx.defer(() => {
        order.push(3);
      });

      await executeHandlerDeferredCallbacks(ctx);

      expect(order).toEqual([3, 2, 1]);
    });

    test('continues executing remaining callbacks when one throws error', async () => {
      const { ctx } = createTestHandlerContext();
      const order: number[] = [];

      ctx.defer(() => {
        order.push(1);
      });
      ctx.defer(() => {
        order.push(2);
      });
      ctx.defer(() => {
        throw new Error('boom');
      });
      ctx.defer(() => {
        order.push(3);
      });

      await executeHandlerDeferredCallbacks(ctx);

      expect(order).toEqual([3, 2, 1]);
    });

    test('logs errors when callback throws', async () => {
      const { ctx, logger } = createTestHandlerContext();

      ctx.defer(() => {
        throw new Error('boom');
      });

      await executeHandlerDeferredCallbacks(ctx);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('type contracts', () => {
    test('context maintains generic type parameters correctly', () => {
      const { ctx } = createTestHandlerContext();

      // Base context has expected core methods
      expectTypeOf(ctx.withReq).toBeFunction();
      expectTypeOf(ctx.withRes).toBeFunction();
      expectTypeOf(ctx.defer).toBeFunction();

      // Extensions preserve base types while adding new ones
      const withAuth = ctx.withReq({ userId: 'test-user' });
      expectTypeOf(withAuth.withReq).toBeFunction();
      expectTypeOf(withAuth.req).toHaveProperty('userId');
      expectTypeOf(withAuth.req.userId).toEqualTypeOf<string>();
      expectTypeOf(withAuth.res.json).toBeFunction();
    });
  });
});
