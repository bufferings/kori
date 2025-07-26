export function createCacheControlHeader(maxAge?: number, immutable?: boolean): string | null {
  const parts: string[] = [];

  if (typeof maxAge === 'number' && maxAge >= 0) {
    const maxAgeValue = Math.floor(maxAge);
    parts.push(`max-age=${maxAgeValue}`);
  }

  if (immutable === true) {
    parts.push('immutable');
  }

  return parts.length > 0 ? parts.join(', ') : null;
}
