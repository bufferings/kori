import { createReadStream } from 'node:fs';

import { type ParsedRange } from './types.js';

/**
 * Create a readable stream for partial file content
 */
export function createPartialFileStream(filePath: string, start: number, end: number): ReadableStream {
  const nodeStream = createReadStream(filePath, { start, end });

  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });

      nodeStream.on('end', () => {
        controller.close();
      });

      nodeStream.on('error', (error) => {
        controller.error(error);
      });
    },

    cancel() {
      nodeStream.destroy();
    },
  });
}

/**
 * Generate Content-Range header value
 */
export function generateContentRangeHeader(start: number, end: number, totalSize: number): string {
  return `bytes ${start}-${end}/${totalSize}`;
}

/**
 * Generate a unique boundary for multipart responses
 */
export function generateBoundary(): string {
  return `----kori-boundary-${Date.now()}-${Math.random().toString(36).substring(2)}`;
}

/**
 * Generate content for a single range
 */
async function* generateRangeContent(filePath: string, range: ParsedRange): AsyncGenerator<Uint8Array> {
  const stream = createReadStream(filePath, {
    start: range.start,
    end: range.end,
  });

  try {
    for await (const chunk of stream) {
      yield new Uint8Array(chunk);
    }
  } finally {
    stream.destroy();
  }
}

/**
 * Generate multipart chunks using async generator
 */
async function* generateMultipartChunks(
  filePath: string,
  ranges: ParsedRange[],
  totalSize: number,
  mimeType: string,
  boundary: string,
): AsyncGenerator<Uint8Array> {
  const encoder = new TextEncoder();

  for (const [i, range] of ranges.entries()) {
    // Yield boundary headers
    const boundaryData =
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType}\r\n` +
      `Content-Range: bytes ${range.start}-${range.end}/${totalSize}\r\n` +
      `Content-Length: ${range.end - range.start + 1}\r\n\r\n`;

    yield encoder.encode(boundaryData);

    // Yield file content for this range
    yield* generateRangeContent(filePath, range);

    // Add line break before next boundary (except for last range)
    if (i < ranges.length - 1) {
      yield encoder.encode('\r\n');
    }
  }

  // Yield closing boundary
  yield encoder.encode(`\r\n--${boundary}--\r\n`);
}

/**
 * Create a multipart byterange stream using generators
 */
export function createMultipartStream(
  filePath: string,
  ranges: ParsedRange[],
  totalSize: number,
  mimeType: string,
  boundary: string,
): ReadableStream {
  const generator = generateMultipartChunks(filePath, ranges, totalSize, mimeType, boundary);

  return new ReadableStream({
    async pull(controller) {
      try {
        const result = await generator.next();

        if (result.done) {
          controller.close();
        } else {
          controller.enqueue(result.value);
        }
      } catch (error) {
        controller.error(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async cancel() {
      await generator.return(undefined);
    },
  });
}
