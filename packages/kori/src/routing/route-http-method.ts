export type RouteHttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'
  | { custom: Uppercase<string> };

export function normalizeRouteHttpMethod(method: RouteHttpMethod): string {
  return typeof method === 'string' ? method : method.custom;
}
