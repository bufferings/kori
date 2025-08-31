import { type KoriRequest } from '../context/index.js';

type CleanParam<T extends string> = T extends `${infer Name}?`
  ? Name
  : T extends `${infer Name}{${string}}`
    ? Name
    : T extends `${infer Name}{${string}}?`
      ? Name
      : T extends ''
        ? never
        : T;

type ParamTokenToRecord<T extends string> =
  CleanParam<T> extends never ? Record<never, never> : Record<CleanParam<T>, string>;

type MergePathParams<A extends Record<string, string>, B extends Record<string, string>> = {
  [K in keyof A | keyof B]: K extends keyof B ? B[K] : K extends keyof A ? A[K] : never;
};

export type PathParams<Path extends string> = string extends Path
  ? Record<string, string>
  : Path extends `${string}:${infer ParamWithRest}`
    ? ParamWithRest extends `${infer Param}/${infer Rest}`
      ? MergePathParams<ParamTokenToRecord<Param>, PathParams<`/${Rest}`>>
      : MergePathParams<ParamTokenToRecord<ParamWithRest>, Record<never, never>>
    : Record<never, never>;

export type WithPathParams<Req extends KoriRequest, Path extends string> = Omit<Req, 'pathParams'> & {
  pathParams: () => PathParams<Path>;
};
