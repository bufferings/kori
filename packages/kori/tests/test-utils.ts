import { vi } from 'vitest';

import { createKoriEnvironment, type KoriEnvironment } from '../src/context/environment.js';
import { createKoriHandlerContext, type KoriHandlerContext } from '../src/context/handler-context.js';
import { createKoriInstanceContext, type KoriInstanceContext } from '../src/context/instance-context.js';
import { createKoriRequest, type KoriRequest } from '../src/context/request.js';
import { createKoriResponse, type KoriResponse } from '../src/context/response.js';
import { type KoriLogger, type KoriLoggerFactory } from '../src/logging/index.js';

/**
 * Creates a stub logger for testing that satisfies the KoriLogger interface.
 * All methods are vi.fn() spies for easy assertion.
 */
export function createLoggerStub(): KoriLogger {
  const base = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    isLevelEnabled: () => true,
    serializeError: vi.fn(() => ({})),
  } as unknown as KoriLogger;

  base.channel = () => base;
  base.child = () => base;
  base.addBindings = () => base;
  return base;
}

/**
 * Creates a logger factory that returns the same stub logger instance.
 * Useful for context creation in tests.
 */
export function createLoggerFactoryStub(): { logger: KoriLogger; factory: KoriLoggerFactory } {
  const logger = createLoggerStub();
  const factory: KoriLoggerFactory = () => logger;
  return { logger, factory };
}

/**
 * Creates a simple logger stub for type tests that doesn't use vi.fn().
 * Only provides method signatures for type checking, not actual spies.
 */
export function createSimpleLoggerStub(): KoriLogger {
  const base = {
    debug() {
      // No-op for testing
    },
    info() {
      // No-op for testing
    },
    warn() {
      // No-op for testing
    },
    error() {
      // No-op for testing
    },
    fatal() {
      // No-op for testing
    },
    isLevelEnabled: () => true,
    serializeError: () => ({}),
  } as unknown as KoriLogger;

  base.channel = () => base;
  base.child = () => base;
  base.addBindings = () => base;
  return base;
}

/**
 * Creates a test handler context with default setup.
 * Reduces boilerplate in context-related tests.
 */
export function createTestHandlerContext(): {
  env: KoriEnvironment;
  req: KoriRequest;
  res: KoriResponse;
  ctx: KoriHandlerContext<KoriEnvironment, KoriRequest, KoriResponse>;
  logger: KoriLogger;
} {
  const { logger, factory: loggerFactory } = createLoggerFactoryStub();

  const env = createKoriEnvironment();
  const req = createKoriRequest({
    rawRequest: new Request('http://x'),
    pathParams: {},
    pathTemplate: '/',
  });
  const res = createKoriResponse(req);
  const ctx = createKoriHandlerContext({ env, req, res, loggerFactory });

  return { env, req, res, ctx, logger };
}

/**
 * Creates a test instance context with default setup.
 * Reduces boilerplate in instance context tests.
 */
export function createTestInstanceContext(): {
  env: KoriEnvironment;
  ctx: KoriInstanceContext<KoriEnvironment>;
  instanceLogger: KoriLogger;
} {
  const instanceLogger = createLoggerStub();
  const env = createKoriEnvironment();
  const ctx = createKoriInstanceContext({ env, instanceLogger });

  return { env, ctx, instanceLogger };
}
