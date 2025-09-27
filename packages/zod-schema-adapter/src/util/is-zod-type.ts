import { z } from 'zod';

/** @packageInternal */
export function isZodType(value: unknown): value is z.ZodType {
  return value instanceof z.ZodType;
}
