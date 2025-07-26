import { createReadStream } from 'node:fs';

/**
 * Create Web Streams ReadableStream from file path
 */
export function createFileStream(filePath: string): ReadableStream {
  const nodeStream = createReadStream(filePath);

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
