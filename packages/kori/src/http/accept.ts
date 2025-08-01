type AcceptedMediaType = {
  mediaType: string;
  quality: number;
};

/**
 * Parse Accept header value and return sorted array by quality
 */
export function parseAcceptHeader(acceptHeader: string): AcceptedMediaType[] {
  const types: AcceptedMediaType[] = [];

  const parts = acceptHeader.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }

    const [mediaType, ...params] = trimmed.split(';');

    if (!mediaType) {
      continue;
    }

    let quality = 1.0;

    for (const param of params) {
      const paramTrimmed = param.trim();
      if (paramTrimmed.startsWith('q=')) {
        const qValue = parseFloat(paramTrimmed.slice(2));
        if (!isNaN(qValue) && qValue >= 0 && qValue <= 1) {
          quality = qValue;
        }
        break;
      }
    }

    types.push({
      mediaType: mediaType.trim().toLowerCase(),
      quality,
    });
  }

  return types.sort((a, b) => {
    if (a.quality !== b.quality) {
      return b.quality - a.quality;
    }
    if (a.mediaType.includes('*') && !b.mediaType.includes('*')) {
      return 1;
    }
    if (!a.mediaType.includes('*') && b.mediaType.includes('*')) {
      return -1;
    }
    return 0;
  });
}

/**
 * Check if a media type matches a pattern (supports wildcards)
 */
export function matchesMediaType(mediaType: string, pattern: string): boolean {
  if (mediaType === pattern) {
    return true;
  }

  if (pattern === '*/*') {
    return true;
  }

  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    return mediaType.startsWith(prefix + '/');
  }

  return false;
}
