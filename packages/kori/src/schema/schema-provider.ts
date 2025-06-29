export type KoriSchemaProvider<T extends string> = {
  readonly __provider: T;
};

export type KoriSchemaProviderDefault = KoriSchemaProvider<string>;

export type SchemaProvidersMatch<P1, P2> =
  P1 extends KoriSchemaProvider<infer T1>
    ? P2 extends KoriSchemaProvider<infer T2>
      ? T1 extends T2
        ? true
        : false
      : false
    : false;
