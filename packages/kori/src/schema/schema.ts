const Brand = Symbol('schema-brand');
const OutputProp = Symbol('schema-output-prop');

export type KoriSchema<Def, Out> = {
  readonly [Brand]: typeof Brand;
  readonly def: Def;
  readonly [OutputProp]?: Out;
};

export type KoriSchemaDefault = KoriSchema<unknown, unknown>;

export function isKoriSchema(value: unknown): value is KoriSchemaDefault {
  return typeof value === 'object' && value !== null && Brand in value;
}

export type InferSchemaOutput<S> = S extends KoriSchema<infer _Def, infer Out> ? Out : never;

export function createKoriSchema<Def, Out>(def: Def): KoriSchema<Def, Out> {
  return {
    [Brand]: Brand,
    def,
  };
}
