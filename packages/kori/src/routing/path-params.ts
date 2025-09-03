import { type KoriRequest } from '../context/index.js';

/** Removes optional and regex modifiers from path parameter names */
type CleanParam<T extends string> = T extends `${infer Name}{${string}}?`
  ? Name
  : T extends `${infer Name}?`
    ? Name
    : T extends `${infer Name}{${string}}`
      ? Name
      : T extends ''
        ? never
        : T;

/** Checks if a parameter token is optional (ends with ?) */
type IsOptionalParam<T extends string> = T extends `${string}?` ? true : false;

/** Converts single parameter token to Record type with correct optionality */
type ParamTokenToRecord<T extends string> =
  CleanParam<T> extends never
    ? Record<never, never>
    : IsOptionalParam<T> extends true
      ? Record<CleanParam<T>, string | undefined>
      : Record<CleanParam<T>, string>;

/** Merges two parameter Records with B taking precedence over A */
type MergePathParams<A extends Record<string, string | undefined>, B extends Record<string, string | undefined>> = {
  [K in keyof A | keyof B]: K extends keyof B ? B[K] : K extends keyof A ? A[K] : never;
};

/**
 * Extracts path parameter types from a URL pattern.
 *
 * Supports various parameter patterns including optional parameters,
 * regex constraints, and nested paths. Parameter names are extracted
 * from `:param` syntax in the path template.
 *
 * @template Path - URL path pattern with parameter placeholders
 *
 * @example
 * ```typescript
 * type UserParams = PathParams<'/users/:id'>; // { id: string }
 * type PostParams = PathParams<'/posts/:slug/comments/:commentId'>; // { slug: string; commentId: string }
 * type OptionalParams = PathParams<'/api/:version?'>; // { version: string }
 * ```
 */
export type PathParams<Path extends string> = string extends Path
  ? Record<string, string>
  : Path extends `${string}:${infer ParamWithRest}`
    ? ParamWithRest extends `${infer Param}/${infer Rest}`
      ? MergePathParams<ParamTokenToRecord<Param>, PathParams<`/${Rest}`>>
      : MergePathParams<ParamTokenToRecord<ParamWithRest>, Record<never, never>>
    : Record<never, never>;

/**
 * Extends a request type with path parameter access method.
 *
 * Replaces the generic `pathParams()` method with a type-safe version
 * that returns parameters extracted from the specific path pattern.
 *
 * @template Req - Base request type to extend
 * @template Path - URL path pattern with parameter placeholders
 *
 * @example
 * ```typescript
 * // For route '/users/:id/posts/:postId'
 * type ExtendedReq = WithPathParams<KoriRequest, '/users/:id/posts/:postId'>;
 * // req.pathParams() returns { id: string; postId: string }
 * ```
 */
export type WithPathParams<Req extends KoriRequest, Path extends string> = Omit<Req, 'pathParams'> & {
  pathParams: () => PathParams<Path>;
};
