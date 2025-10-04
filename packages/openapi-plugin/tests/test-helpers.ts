import {
  type KoriLogger,
  type KoriSchemaBase,
  type KoriRequestSchemaBase,
  type KoriResponseSchemaBase,
} from '@korix/kori';
import { vi } from 'vitest';

/**
 * Creates a test schema with provider 'test'.
 *
 * @param overrides - Optional properties to override defaults
 * @returns Test schema instance
 */
export function createTestSchema(overrides: Partial<KoriSchemaBase> = {}): KoriSchemaBase {
  return {
    koriKind: 'kori-schema',
    provider: 'test',
    definition: {},
    ...overrides,
  };
}

/**
 * Creates a test request schema with provider 'test'.
 *
 * @param overrides - Optional properties to override defaults
 * @returns Test request schema instance
 */
export function createTestRequestSchema(overrides: Partial<KoriRequestSchemaBase> = {}): KoriRequestSchemaBase {
  return {
    koriKind: 'kori-request-schema',
    provider: 'test',
    ...overrides,
  };
}

/**
 * Creates a test response schema with provider 'test'.
 *
 * @param overrides - Optional properties to override defaults
 * @returns Test response schema instance
 */
export function createTestResponseSchema(overrides: Partial<KoriResponseSchemaBase> = {}): KoriResponseSchemaBase {
  return {
    koriKind: 'kori-response-schema',
    provider: 'test',
    ...overrides,
  };
}

/**
 * Creates a logger stub for testing.
 *
 * All logging methods are vi.fn() spies. Methods that return a logger
 * (channel, child, addBindings) return the same stub instance for chaining.
 *
 * @returns Logger stub instance
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
