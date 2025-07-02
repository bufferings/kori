const Brand = Symbol('schema-brand');
const OutputProp = Symbol('schema-output-prop');

export type KoriSchema<Def, Out> = {
  readonly [Brand]: symbol;
  readonly def: Def;
  readonly [OutputProp]?: Out;
};

export type KoriSchemaDefault = KoriSchema<unknown, unknown>;

export function isKoriSchema(value: unknown): value is KoriSchemaDefault {
  return typeof value === 'object' && value !== null && Brand in value;
}

export function getKoriSchemaBrand(schema: KoriSchemaDefault): symbol {
  return schema[Brand];
}

export type InferSchemaOutput<S> = S extends KoriSchema<infer _Def, infer Out> ? Out : never;

export function createKoriSchema<Def, Out>(brand: symbol, def: Def): KoriSchema<Def, Out> {
  return {
    [Brand]: brand,
    def,
  };
}
