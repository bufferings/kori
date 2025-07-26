import { mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createKori } from '@korix/kori';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { staticFilePlugin, type StaticFileOptions } from '../src/index.js';

describe('static-file-plugin-nodejs', () => {
  let tempDir: string;
  let publicDir: string;

  async function fetchFromApp(
    app: ReturnType<typeof createKori>,
    url: string,
    headers?: Record<string, string>,
  ): Promise<Response> {
    const generated = app.generate();
    const { fetchHandler } = await generated.onInit();
    return fetchHandler(new Request(url, { headers }));
  }

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = join(tmpdir(), `kori-static-test-${Date.now()}`);
    publicDir = join(tempDir, 'public');

    await mkdir(publicDir, { recursive: true });

    // Create test files
    await writeFile(join(publicDir, 'index.html'), '<html><body>Index</body></html>');
    await writeFile(join(publicDir, 'style.css'), 'body { margin: 0; }');
    await writeFile(join(publicDir, 'script.js'), 'console.log("test");');
    await writeFile(join(publicDir, 'image.png'), new Uint8Array(Buffer.from('fake-png-data')));
    await writeFile(join(publicDir, '.env'), 'SECRET=test');

    // Create a larger test file for range testing
    const largeContent = 'A'.repeat(1000) + 'B'.repeat(1000) + 'C'.repeat(1000);
    await writeFile(join(publicDir, 'large-file.txt'), largeContent);

    // Create subdirectory with index
    await mkdir(join(publicDir, 'admin'), { recursive: true });
    await writeFile(join(publicDir, 'admin', 'index.html'), '<html><body>Admin</body></html>');

    // Create subdirectory without index
    await mkdir(join(publicDir, 'assets'), { recursive: true });
    await writeFile(join(publicDir, 'assets', 'logo.png'), new Uint8Array(Buffer.from('fake-logo-data')));
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('Range Request support', () => {
    it('should include Accept-Ranges header by default', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt');

      expect(response.status).toBe(200);
      expect(response.headers.get('Accept-Ranges')).toBe('bytes');
    });

    it('should serve partial content for valid range requests', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      // Request first 500 bytes
      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=0-499',
      });

      expect(response.status).toBe(206);
      expect(response.headers.get('Content-Range')).toBe('bytes 0-499/3000');
      expect(response.headers.get('Content-Length')).toBe('500');
      expect(response.headers.get('Accept-Ranges')).toBe('bytes');

      const content = await response.text();
      expect(content).toBe('A'.repeat(500));
    });

    it('should handle suffix range requests', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      // Request last 500 bytes
      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=-500',
      });

      expect(response.status).toBe(206);
      expect(response.headers.get('Content-Range')).toBe('bytes 2500-2999/3000');
      expect(response.headers.get('Content-Length')).toBe('500');

      const content = await response.text();
      expect(content).toBe('C'.repeat(500));
    });

    it('should handle start range requests', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      // Request from byte 2500 to end
      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=2500-',
      });

      expect(response.status).toBe(206);
      expect(response.headers.get('Content-Range')).toBe('bytes 2500-2999/3000');
      expect(response.headers.get('Content-Length')).toBe('500');

      const content = await response.text();
      expect(content).toBe('C'.repeat(500));
    });

    it('should return 416 for unsatisfiable ranges', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      // Request range beyond file size
      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=5000-6000',
      });

      expect(response.status).toBe(416);
      expect(response.headers.get('Content-Range')).toBe('bytes */3000');

      const json = (await response.json()) as { error: { type: string; message: string } };
      expect(json.error.type).toBe('RANGE_NOT_SATISFIABLE');
    });

    it('should return 416 for invalid range format', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      // Invalid range format
      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=invalid-range',
      });

      expect(response.status).toBe(416);
      expect(response.headers.get('Content-Range')).toBe('bytes */3000');
    });

    it('should reject multiple ranges when maxRanges is 1', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          maxRanges: 1,
        }),
      );

      // Multiple ranges request
      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=0-499,1000-1499',
      });

      expect(response.status).toBe(416);

      const json = (await response.json()) as { error: { type: string; message: string } };
      expect(json.error.type).toBe('TOO_MANY_RANGES');
    });

    it('should disable range requests when ranges option is false', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          ranges: false,
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=0-499',
      });

      // Should return full file, not partial content
      expect(response.status).toBe(200);
      expect(response.headers.get('Accept-Ranges')).toBe('none');
      expect(response.headers.get('Content-Length')).toBe('3000');

      const content = await response.text();
      expect(content.length).toBe(3000);
    });

    it('should work with conditional requests and ranges', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          etag: true,
        }),
      );

      // First request to get ETag
      const firstResponse = await fetchFromApp(app, 'http://localhost/static/large-file.txt');
      const etag = firstResponse.headers.get('etag');
      expect(etag).toBeTruthy();

      // Range request with matching ETag should return 304
      if (etag) {
        const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
          Range: 'bytes=0-499',
          'If-None-Match': etag,
        });

        expect(response.status).toBe(304);
      }
    });

    it('should handle range requests for different MIME types', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      // Test with CSS file
      const response = await fetchFromApp(app, 'http://localhost/static/style.css', {
        Range: 'bytes=0-9',
      });

      expect(response.status).toBe(206);
      expect(response.headers.get('Content-Type')).toBe('text/css');
      expect(response.headers.get('Content-Range')).toBe('bytes 0-9/19');

      const content = await response.text();
      expect(content).toBe('body { mar');
    });

    it('should handle edge cases with range boundaries', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      // Request exactly to file boundary
      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=0-2999',
      });

      expect(response.status).toBe(206);
      expect(response.headers.get('Content-Range')).toBe('bytes 0-2999/3000');
      expect(response.headers.get('Content-Length')).toBe('3000');

      const content = await response.text();
      expect(content.length).toBe(3000);
    });

    it('should handle zero-length range requests', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      // Request single byte
      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=0-0',
      });

      expect(response.status).toBe(206);
      expect(response.headers.get('Content-Range')).toBe('bytes 0-0/3000');
      expect(response.headers.get('Content-Length')).toBe('1');

      const content = await response.text();
      expect(content).toBe('A');
    });

    it('should handle multipart range requests', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          maxRanges: 5, // Allow multiple ranges
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=0-99,500-599',
      });

      expect(response.status).toBe(206);
      expect(response.headers.get('Content-Type')).toMatch(/^multipart\/byteranges; boundary=/);
      expect(response.headers.get('Accept-Ranges')).toBe('bytes');

      const content = await response.text();

      // Should contain multipart boundary structure
      expect(content).toMatch(/----kori-boundary-/);
      expect(content).toMatch(/Content-Type: text\/plain/);
      expect(content).toMatch(/Content-Range: bytes 0-99\/3000/);
      expect(content).toMatch(/Content-Range: bytes 500-599\/3000/);
    });

    it('should handle multipart range requests with maxRanges limit', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          ranges: true,
          maxRanges: 2,
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=0-99,200-299,400-499', // 3 ranges, limit is 2
      });

      expect(response.status).toBe(416);
      expect(response.headers.get('Content-Type')).toBe('application/json;charset=utf-8');

      const errorData = (await response.json()) as { error: { type: string; message: string } };
      expect(errorData.error.type).toBe('TOO_MANY_RANGES');
      expect(errorData.error.message).toContain('Maximum allowed: 2');
    });

    it('should handle mixed valid and invalid ranges in multipart request', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=0-99,5000-6000', // Second range is invalid (beyond file size)
      });

      // Should return 206 with only valid ranges per HTTP RFC 7233
      // Invalid ranges should be ignored if at least one range is satisfiable
      expect(response.status).toBe(206);

      // Since only one valid range remains, it should be a single range response
      expect(response.headers.get('Content-Type')).toBe('text/plain');
      expect(response.headers.get('Content-Range')).toBe('bytes 0-99/3000');
      expect(response.headers.get('Content-Length')).toBe('100');

      const content = await response.text();
      // Should contain only the valid range content (first 100 bytes)
      expect(content).toBe('A'.repeat(100));
    });

    it('should support custom maxRanges for multipart requests', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          ranges: true,
          maxRanges: 5,
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/large-file.txt', {
        Range: 'bytes=0-99,200-299,400-499,600-699,800-899', // 5 ranges
      });

      expect(response.status).toBe(206);
      expect(response.headers.get('Content-Type')).toMatch(/^multipart\/byteranges; boundary=/);

      const content = await response.text();
      expect(content).toMatch(/----kori-boundary-/);
      // Should contain all 5 ranges
      expect(content).toMatch(/Content-Range: bytes 0-99\/3000/);
      expect(content).toMatch(/Content-Range: bytes 200-299\/3000/);
      expect(content).toMatch(/Content-Range: bytes 400-499\/3000/);
      expect(content).toMatch(/Content-Range: bytes 600-699\/3000/);
      expect(content).toMatch(/Content-Range: bytes 800-899\/3000/);
    });
  });

  describe('basic functionality', () => {
    it('should serve static files', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/index.html');

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('<html><body>Index</body></html>');
    });

    it('should detect correct MIME types', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const responses = await Promise.all([
        fetchFromApp(app, 'http://localhost/static/style.css'),
        fetchFromApp(app, 'http://localhost/static/script.js'),
        fetchFromApp(app, 'http://localhost/static/image.png'),
      ]);

      expect(responses[0].headers.get('content-type')).toBe('text/css');
      expect(responses[1].headers.get('content-type')).toBe('text/javascript');
      expect(responses[2].headers.get('content-type')).toBe('image/png');
    });

    it('should return 404 for non-existent files', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/nonexistent.txt');

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: {
          type: 'NOT_FOUND',
          message: 'File not found',
        },
      });
    });

    it('should ignore requests that do not match mountAt', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/assets',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/index.html');

      expect(response.status).toBe(404);
    });
  });

  describe('index file resolution', () => {
    it('should serve index.html for directory requests', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/html');
      expect(await response.text()).toBe('<html><body>Index</body></html>');
    });

    it('should serve index.html for mount point without trailing slash', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/html');
      expect(await response.text()).toBe('<html><body>Index</body></html>');
    });

    it('should handle various path patterns correctly', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      // Test various path patterns
      const testCases = [
        { path: 'http://localhost/static', expectedStatus: 200 },
        { path: 'http://localhost/static/', expectedStatus: 200 },
        { path: 'http://localhost/static/index.html', expectedStatus: 200 },
        { path: 'http://localhost/static/admin', expectedStatus: 200 },
        { path: 'http://localhost/static/admin/', expectedStatus: 200 },
      ];

      for (const { path, expectedStatus } of testCases) {
        const response = await fetchFromApp(app, path);
        expect(response.status).toBe(expectedStatus);
      }
    });

    it('should serve index.html for subdirectory requests', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/admin/');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/html');
      expect(await response.text()).toBe('<html><body>Admin</body></html>');
    });

    it('should return 404 for directories without index files', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/assets/');

      expect(response.status).toBe(404);
    });

    it('should respect index: false option', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          index: false,
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/');

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: {
          type: 'FORBIDDEN',
          message: 'Directory listing is disabled',
        },
      });
    });
  });

  describe('dotfiles handling', () => {
    it('should deny dotfiles by default', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/.env');

      expect(response.status).toBe(404);
    });

    it('should deny dotfiles when configured', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          dotfiles: 'deny',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/.env');

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: {
          type: 'NOT_FOUND',
          message: 'File not found',
        },
      });
    });

    it('should allow dotfiles when configured', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          dotfiles: 'allow',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/.env');

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('SECRET=test');
    });
  });

  describe('caching headers', () => {
    it('should set cache headers', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          maxAge: 3600,
          etag: true,
          lastModified: true,
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/index.html');

      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
      expect(response.headers.get('etag')).toBeTruthy();
      expect(response.headers.get('last-modified')).toBeTruthy();
    });

    it('should handle conditional requests', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          etag: true,
        }),
      );

      // First request to get ETag
      const firstResponse = await fetchFromApp(app, 'http://localhost/static/index.html');
      const etag = firstResponse.headers.get('etag');

      expect(firstResponse.status).toBe(200);
      expect(etag).toBeTruthy();

      // Second request with If-None-Match header
      const generated = app.generate();
      const { fetchHandler } = await generated.onInit();
      const secondResponse = await fetchHandler(
        new Request('http://localhost/static/index.html', {
          headers: {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            'if-none-match': etag!,
          },
        }),
      );

      expect(secondResponse.status).toBe(304);
    });

    it('should handle If-Modified-Since conditional requests', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          lastModified: true,
        }),
      );

      // First request to get Last-Modified header
      const firstResponse = await fetchFromApp(app, 'http://localhost/static/index.html');
      const lastModified = firstResponse.headers.get('last-modified');

      expect(firstResponse.status).toBe(200);
      expect(lastModified).toBeTruthy();

      // Second request with If-Modified-Since header (same timestamp)
      const generated = app.generate();
      const { fetchHandler } = await generated.onInit();
      const secondResponse = await fetchHandler(
        new Request('http://localhost/static/index.html', {
          headers: {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            'if-modified-since': lastModified!,
          },
        }),
      );

      expect(secondResponse.status).toBe(304);
    });

    it('should return file when If-Modified-Since is older than file', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          lastModified: true,
        }),
      );

      // Request with old If-Modified-Since date (1 year ago)
      const oldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toUTCString();
      const response = await fetchFromApp(app, 'http://localhost/static/index.html', {
        'If-Modified-Since': oldDate,
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('last-modified')).toBeTruthy();
      expect(await response.text()).toBe('<html><body>Index</body></html>');
    });

    it('should prioritize ETag over Last-Modified when both present', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
          etag: true,
          lastModified: true,
        }),
      );

      // First request to get both ETag and Last-Modified
      const firstResponse = await fetchFromApp(app, 'http://localhost/static/index.html');
      const etag = firstResponse.headers.get('etag');
      const lastModified = firstResponse.headers.get('last-modified');

      expect(firstResponse.status).toBe(200);
      expect(etag).toBeTruthy();
      expect(lastModified).toBeTruthy();

      // Request with both headers - ETag should take priority
      const generated = app.generate();
      const { fetchHandler } = await generated.onInit();
      const secondResponse = await fetchHandler(
        new Request('http://localhost/static/index.html', {
          headers: {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            'if-none-match': etag!,
            // Use old date for If-Modified-Since to test ETag priority (1 year ago)
            'if-modified-since': new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toUTCString(),
          },
        }),
      );

      expect(secondResponse.status).toBe(304);
    });
  });

  describe('security', () => {
    it('should prevent directory traversal attacks', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/../../../etc/passwd');

      expect(response.status).toBe(404);
    });

    it('should handle encoded path traversal attempts', async () => {
      const app = createKori().applyPlugin(
        staticFilePlugin({
          serveFrom: publicDir,
          mountAt: '/static',
        }),
      );

      const response = await fetchFromApp(app, 'http://localhost/static/%2e%2e%2f%2e%2e%2fetc%2fpasswd');

      expect(response.status).toBe(404);
    });
  });

  describe('validation', () => {
    it('should require root directory', () => {
      expect(() => {
        createKori().applyPlugin(staticFilePlugin({} as StaticFileOptions));
      }).toThrow('Static file plugin requires a serveFrom directory');
    });

    it('should validate maxAge', () => {
      expect(() => {
        createKori().applyPlugin(
          staticFilePlugin({
            serveFrom: publicDir,
            maxAge: -1,
          }),
        );
      }).toThrow('maxAge must be a non-negative number');
    });

    it('should validate prefix format', () => {
      expect(() => {
        createKori().applyPlugin(
          staticFilePlugin({
            serveFrom: publicDir,
            mountAt: 'invalid-prefix',
          }),
        );
      }).toThrow('mountAt must start with "/"');
    });
  });
});
