import { type KoriResponseSchema, type KoriResponseSchemaBody, type KoriResponseSchemaBodyItem } from '@korix/kori';
import { type z } from 'zod';

import { type KoriZodSchema, type KoriZodSchemaProvider, createKoriZodSchema } from './zod-schema.js';

export type KoriZodResponseSchema = KoriResponseSchema<KoriZodSchemaProvider>;

type ZodResponseMediaEntry = z.ZodType | { schema: z.ZodType; examples?: Record<string, unknown> };
type ZodResponseContent = Record<string, ZodResponseMediaEntry>;
type ZodResponseSpec = { description?: string; headers?: Record<string, unknown>; content: ZodResponseContent };

export function zodResponseSchema(
  schema: Record<string, ZodResponseContent | ZodResponseSpec | z.ZodType>,
): KoriZodResponseSchema {
  // If already in Kori shape, return as-is
  if (typeof schema === 'object') {
    const entries = Object.entries(schema as Record<string, unknown>);
    const converted: Record<string, unknown> = {};
    for (const [status, value] of entries) {
      // Single zod type directly
      if (value && typeof value === 'object' && 'safeParse' in (value as Record<string, unknown>)) {
        converted[status] = createKoriZodSchema(value as z.ZodType);
        continue;
      }

      // Spec with content
      const asSpec = value as ZodResponseSpec;
      if (asSpec && typeof asSpec === 'object' && 'content' in asSpec) {
        converted[status] = {
          description: asSpec.description,
          content: toKoriZodResponseContent(asSpec.content),
        } satisfies KoriResponseSchemaBody<never, Record<string, KoriResponseSchemaBodyItem<KoriZodSchema<z.ZodType>>>>;
        continue;
      }

      // Content map
      const asContent = value as ZodResponseContent;
      if (asContent && typeof asContent === 'object') {
        converted[status] = { content: toKoriZodResponseContent(asContent) } satisfies KoriResponseSchemaBody<
          never,
          Record<string, KoriResponseSchemaBodyItem<KoriZodSchema<z.ZodType>>>
        >;
        continue;
      }

      converted[status] = value;
    }
    return converted as KoriZodResponseSchema;
  }
  return schema as KoriZodResponseSchema;
}

function toKoriZodResponseContent(
  content: ZodResponseContent,
): Record<string, KoriResponseSchemaBodyItem<KoriZodSchema<z.ZodType>>> {
  const out: Record<string, KoriResponseSchemaBodyItem<KoriZodSchema<z.ZodType>>> = {};
  for (const [mt, entry] of Object.entries(content)) {
    if (entry && typeof entry === 'object' && 'safeParse' in (entry as Record<string, unknown>)) {
      out[mt] = createKoriZodSchema(entry as z.ZodType);
    } else {
      const e = entry as { schema: z.ZodType; examples?: Record<string, unknown> };
      out[mt] = { schema: createKoriZodSchema(e.schema), examples: e.examples };
    }
  }
  return out;
}
