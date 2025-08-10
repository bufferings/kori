import { describe, test, expect, expectTypeOf } from 'vitest';

import { executeInstanceDeferredCallbacks } from '../../src/context/instance-context.js';
import { createTestInstanceContext } from '../test-utils.js';

describe('KoriInstanceContext contract', () => {
  describe('withEnv', () => {
    test('mutates env and allows chaining', () => {
      const { ctx } = createTestInstanceContext();

      const extendedCtx = ctx.withEnv({ db: { query: (_sql: string) => Promise.resolve(1) } });

      expect(extendedCtx.env.db).toBeDefined();
    });

    test('extends environment type correctly', () => {
      const { ctx } = createTestInstanceContext();
      const extendedCtx = ctx.withEnv({ db: { query: (_sql: string) => Promise.resolve(1) } });

      expectTypeOf(extendedCtx.env.db.query).parameters.toEqualTypeOf<[string]>();
      expectTypeOf(extendedCtx.env.db.query).returns.toEqualTypeOf<Promise<number>>();

      // @ts-expect-error - db should not exist on original context
      expectTypeOf(ctx.env.db).toBeAny();
    });
  });

  describe('defer', () => {
    test('executes callbacks in LIFO order', async () => {
      const { ctx } = createTestInstanceContext();
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

      await executeInstanceDeferredCallbacks(ctx);

      expect(order).toEqual([3, 2, 1]);
    });

    test('continues executing remaining callbacks when one throws error', async () => {
      const { ctx } = createTestInstanceContext();
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

      await executeInstanceDeferredCallbacks(ctx);

      expect(order).toEqual([3, 2, 1]);
    });

    test('logs errors when callback throws', async () => {
      const { ctx, instanceLogger } = createTestInstanceContext();

      ctx.defer(() => {
        throw new Error('boom');
      });

      await executeInstanceDeferredCallbacks(ctx);

      expect(instanceLogger.error).toHaveBeenCalled();
    });
  });
});
