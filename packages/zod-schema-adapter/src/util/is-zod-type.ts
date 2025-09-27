import { type z } from 'zod';

export function isZodType(value: unknown): value is z.ZodType {
  return typeof value === 'object' && value !== null && 'safeParse' in value;
}
