import {
  createKoriResponseSchema,
  type KoriResponseSchema,
  type KoriResponseSchemaContentEntry,
  type KoriResponseSchemaContentEntryItem,
  type KoriResponseSchemaEntry,
  type KoriResponseSchemaSimpleEntry,
  type KoriResponseSchemaStatusCode,
} from '@korix/kori';
import { type StandardSchemaV1 } from '@standard-schema/spec';

import {
  type KoriStandardSchema,
  type KoriStandardSchemaProvider,
  STANDARD_SCHEMA_PROVIDER,
  createKoriStandardSchema,
} from './standard-schema.js';

export type KoriStandardSchemaResponse<
  Responses extends Partial<Record<KoriResponseSchemaStatusCode, KoriResponseSchemaEntry<KoriStandardSchemaProvider>>>,
> = KoriResponseSchema<KoriStandardSchemaProvider, Responses>;

type StandardSchemaResponseSimpleEntry<SHeaders extends StandardSchemaV1, S extends StandardSchemaV1> =
  | S
  | {
      description?: string;
      headers?: SHeaders;
      schema: S;
      examples?: Record<string, unknown>;
      links?: Record<string, unknown>;
    };

type StandardSchemaResponseContentEntryItem<S extends StandardSchemaV1> =
  | S
  | {
      schema: S;
      examples?: Record<string, unknown>;
    };

type StandardSchemaResponseContentEntryItemBase = StandardSchemaResponseContentEntryItem<StandardSchemaV1>;

type StandardSchemaResponseContentEntryMappingBase = Record<string, StandardSchemaResponseContentEntryItemBase>;

type StandardSchemaResponseContentEntry<
  SHeaders extends StandardSchemaV1,
  SContentMapping extends StandardSchemaResponseContentEntryMappingBase,
> = {
  description?: string;
  headers?: SHeaders;
  content: SContentMapping;
  links?: Record<string, unknown>;
};

type StandardSchemaResponseEntry =
  | StandardSchemaResponseSimpleEntry<StandardSchemaV1, StandardSchemaV1>
  | StandardSchemaResponseContentEntry<StandardSchemaV1, StandardSchemaResponseContentEntryMappingBase>;

type SContentItemToKori<Item> = Item extends StandardSchemaV1
  ? KoriResponseSchemaContentEntryItem<KoriStandardSchema<Item>>
  : Item extends { schema: infer SS; examples?: infer EX }
    ? SS extends StandardSchemaV1
      ? { schema: KoriStandardSchema<SS>; examples?: EX }
      : never
    : never;

type SContentMapToKori<Map extends StandardSchemaResponseContentEntryMappingBase> = {
  [K in keyof Map]: SContentItemToKori<Map[K]>;
};

type SEntryToKori<E> =
  // simple: standard-schema directly
  E extends StandardSchemaV1
    ? KoriResponseSchemaSimpleEntry<KoriStandardSchema<StandardSchemaV1>, KoriStandardSchema<E>>
    : // simple wrapper
      E extends { schema: infer SS; headers?: infer H }
      ? SS extends StandardSchemaV1
        ? KoriResponseSchemaSimpleEntry<
            H extends StandardSchemaV1 ? KoriStandardSchema<H> : KoriStandardSchema<StandardSchemaV1>,
            KoriStandardSchema<SS>
          >
        : never
      : // content: content map
        E extends { content: infer CM; headers?: infer H }
        ? KoriResponseSchemaContentEntry<
            H extends StandardSchemaV1 ? KoriStandardSchema<H> : KoriStandardSchema<StandardSchemaV1>,
            SContentMapToKori<Extract<CM, StandardSchemaResponseContentEntryMappingBase>>
          >
        : never;

export type ToKoriStandardSchemaResponse<
  SResponses extends Partial<Record<KoriResponseSchemaStatusCode, StandardSchemaResponseEntry>>,
> = KoriStandardSchemaResponse<{ [S in keyof SResponses]?: SEntryToKori<SResponses[S]> }>;

function isStandardSchema(value: unknown): value is StandardSchemaV1 {
  return !!value && typeof value === 'object' && '~standard' in (value as Record<string, unknown>);
}

function toKoriContent(
  content: StandardSchemaResponseContentEntryMappingBase,
): Record<string, KoriResponseSchemaContentEntryItem<KoriStandardSchema<StandardSchemaV1>>> {
  const out: Record<string, KoriResponseSchemaContentEntryItem<KoriStandardSchema<StandardSchemaV1>>> = {};
  for (const [mt, item] of Object.entries(content)) {
    if (isStandardSchema(item)) {
      out[mt] = createKoriStandardSchema(item);
    } else {
      out[mt] = { schema: createKoriStandardSchema(item.schema), examples: item.examples };
    }
  }
  return out;
}

function toKoriEntry(entry: StandardSchemaResponseEntry) {
  // simple: standard schema directly
  if (isStandardSchema(entry)) {
    return createKoriStandardSchema(entry);
  }
  // content entry
  if ('content' in entry) {
    return {
      description: entry.description,
      headers: entry.headers ? createKoriStandardSchema(entry.headers) : undefined,
      content: toKoriContent(entry.content),
      links: entry.links,
    };
  }
  // simple: spec wrapper
  return {
    description: entry.description,
    headers: entry.headers ? createKoriStandardSchema(entry.headers) : undefined,
    schema: createKoriStandardSchema(entry.schema),
    examples: entry.examples,
    links: entry.links,
  };
}

export function standardSchemaResponse<
  SResponses extends Partial<Record<KoriResponseSchemaStatusCode, StandardSchemaResponseEntry>>,
>(responses: SResponses): ToKoriStandardSchemaResponse<SResponses> {
  const out = {} as { [S in keyof SResponses]?: SEntryToKori<SResponses[S]> };

  for (const status in responses) {
    const entry = responses[status] as StandardSchemaResponseEntry;
    if (entry !== undefined) {
      out[status] = toKoriEntry(entry) as SEntryToKori<SResponses[typeof status]>;
    }
  }

  return createKoriResponseSchema({
    provider: STANDARD_SCHEMA_PROVIDER,
    responses: out as unknown as Partial<
      Record<KoriResponseSchemaStatusCode, KoriResponseSchemaEntry<KoriStandardSchemaProvider>>
    >,
  }) as ToKoriStandardSchemaResponse<SResponses>;
}
