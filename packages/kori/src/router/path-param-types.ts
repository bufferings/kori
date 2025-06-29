import { type KoriRequest } from '../context/index.js';

// Utility type to extract path parameter names from a route definition string.
// Inspired by Hono/Express implementations but kept local to avoid tight coupling.
type ExtractPathParams<Path extends string> = string extends Path
  ? Record<string, string>
  : Path extends `${string}:${infer ParamWithRest}`
    ? ParamWithRest extends `${infer Param}/${infer Rest}`
      ? // Nested segment case
        MergePathParams<ParamTokenToRecord<Param>, ExtractPathParams<`/${Rest}`>>
      : MergePathParams<ParamTokenToRecord<ParamWithRest>, Record<never, never>>
    : Record<never, never>;

// Convert a single ":param", ":param?", or ":param{...}" token to a Record
type ParamTokenToRecord<T extends string> =
  CleanParam<T> extends never ? Record<never, never> : Record<CleanParam<T>, string>;

// Remove modifiers such as optional (?), custom regex {...}
type CleanParam<T extends string> = T extends `${infer Name}?`
  ? Name
  : T extends `${infer Name}{${string}}`
    ? Name
    : T extends `${infer Name}{${string}}?`
      ? Name
      : T extends ''
        ? never
        : T;

// Merge two Records - keys from B override A when duplicated
type MergePathParams<A extends Record<string, string>, B extends Record<string, string>> = {
  [K in keyof A | keyof B]: K extends keyof B ? B[K] : K extends keyof A ? A[K] : never;
};

// Replace Req.pathParams with one inferred from Path while preserving other fields
export type WithPathParams<Req extends KoriRequest, Path extends string> = Req & {
  pathParams: ExtractPathParams<Path>;
};
