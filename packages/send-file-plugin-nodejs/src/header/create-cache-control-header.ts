export function createCacheControlHeader(maxAge?: number, immutable?: boolean): string | null {
  if (typeof maxAge === 'number' && maxAge >= 0) {
    const maxAgeValue = Math.floor(maxAge);
    let cacheControl = `max-age=${maxAgeValue}`;
    if (immutable === true) {
      cacheControl += ', immutable';
    }
    return cacheControl;
  }
  return null;
}
