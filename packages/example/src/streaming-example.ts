import { createKori, HttpResponseHeader } from '@korix/kori';
import { type KoriRequest } from '@korix/kori';
import { startNodeServer } from '@korix/nodejs-adapter';

const app = createKori();

// Server-Sent Events (SSE) example
app.get('/events', {
  handler: (ctx) => {
    // Create a TransformStream for SSE
    const transformStream = new TransformStream();
    const writer = transformStream.writable.getWriter();
    const encoder = new TextEncoder();

    // Send periodic updates to the client
    const intervalId = setInterval(() => {
      const message = `data: ${JSON.stringify({
        timestamp: new Date().toISOString(),
        message: 'Hello from server!',
      })}\n\n`;
      void writer.write(encoder.encode(message));
    }, 1000);

    // Clean up when client disconnects
    ctx.req.raw().signal.addEventListener('abort', () => {
      clearInterval(intervalId);
      void writer.close();
    });

    // Return streaming response with SSE headers
    return ctx.res
      .setHeader(HttpResponseHeader.CONTENT_TYPE, 'text/event-stream')
      .setHeader(HttpResponseHeader.CACHE_CONTROL, 'no-cache')
      .setHeader(HttpResponseHeader.CONNECTION, 'keep-alive')
      .setHeader(HttpResponseHeader.ACCESS_CONTROL_ALLOW_ORIGIN, '*')
      .stream(transformStream.readable);
  },
});

// File upload streaming example
app.post('/upload-stream', {
  handler: async (ctx) => {
    const { req, res } = ctx;

    // Cast to access the body property directly
    const koriReq = req as KoriRequest;

    // Check if request has a body stream
    const bodyStream = koriReq.bodyStream();
    if (!bodyStream) {
      return res.status(400).json({ error: 'No request body' });
    }

    // Process the stream without loading it entirely into memory
    const reader = bodyStream.getReader();
    let totalBytes = 0;
    const chunks: Uint8Array[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        totalBytes += value.length;
        chunks.push(value);

        // Optional: Process chunks as they arrive
        // This is where you might save to disk, process data, etc.
        ctx.req.log().info('Received chunk', { size: value.length, totalBytes });
      }

      // Combine all chunks (in real use case, you might process them differently)
      const combined = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      return res.json({
        message: 'File uploaded successfully',
        totalBytes,
        chunksReceived: chunks.length,
      });
    } catch (error) {
      ctx.req.log().error('Upload error', { error });
      return res.status(500).json({ error: 'Upload failed' });
    }
  },
});

// Stream response example (e.g., for file downloads)
app.get('/download-stream', {
  handler: (ctx) => {
    // Create a stream that generates data on-demand
    const stream = new ReadableStream({
      start(controller) {
        let counter = 0;
        const encoder = new TextEncoder();

        const interval = setInterval(() => {
          if (counter >= 10) {
            controller.close();
            clearInterval(interval);
            return;
          }

          const data = `Chunk ${counter}\n`;
          controller.enqueue(encoder.encode(data));
          counter++;
        }, 500);

        // Clean up on client disconnect
        ctx.req.raw().signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
        });
      },
    });

    return ctx.res
      .setHeader(HttpResponseHeader.CONTENT_TYPE, 'text/plain')
      .setHeader(HttpResponseHeader.CONTENT_DISPOSITION, 'attachment; filename="stream.txt"')
      .stream(stream);
  },
});

// Start the server
await startNodeServer(app, { port: 3002, hostname: 'localhost' });
