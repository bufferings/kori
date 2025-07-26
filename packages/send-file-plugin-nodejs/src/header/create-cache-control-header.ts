export function createCacheControlHeader(maxAge?: number, immutable?: boolean): string | null {
  const parts: string[] = [];

  if (typeof maxAge === 'number') {
    parts.push(`max-age=${maxAge}`);
  }

  if (immutable === true) {
    parts.push('immutable');
  }

  return parts.length > 0 ? parts.join(', ') : null;
}
