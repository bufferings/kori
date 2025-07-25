# @korix/static-file-plugin-nodejs

Static file serving plugin for the Kori framework (Node.js).

## Installation

```bash
npm install @korix/static-file-plugin-nodejs
# or
pnpm add @korix/static-file-plugin-nodejs
# or
yarn add @korix/static-file-plugin-nodejs
```

## Features

- 🚀 **High Performance**: Streaming file responses with efficient Node.js APIs
- 🔒 **Security First**: Path traversal protection and configurable dotfiles handling
- 📦 **MIME Type Detection**: Automatic content-type headers for common file types
- ⚡ **Caching Support**: ETag, Last-Modified, and Cache-Control headers
- 📁 **Index Files**: Automatic index.html resolution for directories
- 🎯 **Flexible Configuration**: Customizable prefix, dotfiles policy, and more
- 🛡️ **Conditional Requests**: 304 Not Modified support for efficient caching
- 🎬 **Range Requests**: HTTP 206 Partial Content support for streaming media and large files

## Quick Start

```typescript
import { createKori } from '@korix/kori';
import { staticFilePlugin } from '@korix/static-file-plugin-nodejs';

const app = createKori().applyPlugin(
  staticFilePlugin({
    serveFrom: './public',
    mountAt: '/static',
  }),
);

// Files in ./public/ are now accessible at /static/*
// e.g., ./public/style.css → http://localhost/static/style.css
```

## Configuration

### Basic Options

```typescript
type StaticFileOptions = {
  serveFrom: string; // Required: Source directory path
  mountAt?: string; // URL prefix (default: '/static')
  index?: string[] | false; // Index files (default: ['index.html'])
  dotfiles?: 'allow' | 'deny'; // Dotfiles handling (default: 'deny')
  maxAge?: number; // Cache max-age in seconds (default: 0)
  etag?: boolean; // ETag header (default: true)
  lastModified?: boolean; // Last-Modified header (default: true)
  ranges?: boolean; // Range Request support (default: true)
  maxRanges?: number; // Maximum ranges per request (default: 1)
};
```

### Default Configuration

```typescript
{
  mountAt: '/static',
  index: ['index.html'],
  dotfiles: 'deny',
  maxAge: 0,
  etag: true,
  lastModified: true,
  ranges: true,
  maxRanges: 1
}
```

## Range Requests (HTTP 206 Partial Content)

The plugin supports **HTTP Range Requests** for efficient streaming of large files, enabling:

- 📹 **Video/Audio Seeking**: Timeline navigation in media players
- ⬇️ **Resumable Downloads**: Download managers can resume interrupted transfers
- 📱 **Progressive Loading**: Mobile-friendly partial file loading
- 🎯 **Bandwidth Efficiency**: Only transfer needed portions of files

### Range Request Examples

```typescript
// Enable range requests (default)
const app = createKori().applyPlugin(
  staticFilePlugin({
    serveFrom: './media',
    mountAt: '/media',
    ranges: true, // Enable range requests
    maxRanges: 1, // Allow single range per request
  }),
);
```

### Supported Range Formats

| Range Header   | Description           | Example Response                      |
| -------------- | --------------------- | ------------------------------------- |
| `bytes=0-1023` | First 1024 bytes      | `Content-Range: bytes 0-1023/5000`    |
| `bytes=1024-`  | From byte 1024 to end | `Content-Range: bytes 1024-4999/5000` |
| `bytes=-1024`  | Last 1024 bytes       | `Content-Range: bytes 3976-4999/5000` |

### Response Headers

Range requests automatically set appropriate headers:

```http
HTTP/1.1 206 Partial Content
Accept-Ranges: bytes
Content-Range: bytes 0-1023/5000
Content-Length: 1024
Content-Type: video/mp4
```

### Browser Integration

Range requests work automatically with HTML5 media elements:

```html
<!-- Video players automatically use range requests for seeking -->
<video controls>
  <source src="/media/video.mp4" type="video/mp4" />
</video>

<!-- Audio players support timeline navigation -->
<audio controls>
  <source src="/media/audio.mp3" type="audio/mpeg" />
</audio>
```

### Disabling Range Requests

```typescript
// Disable range requests for all files
staticFilePlugin({
  serveFrom: './public',
  ranges: false, // Disable range requests
});

// Response headers will include:
// Accept-Ranges: none
```

## Usage Examples

### Basic Static File Serving

```typescript
import { createKori } from '@korix/kori';
import { staticFilePlugin } from '@korix/static-file-plugin-nodejs';

const app = createKori().applyPlugin(
  staticFilePlugin({
    serveFrom: './public',
  }),
);

// Serves files from ./public/ at /static/*
```

### Media Streaming with Range Support

```typescript
const app = createKori().applyPlugin(
  staticFilePlugin({
    serveFrom: './media',
    mountAt: '/stream',
    ranges: true, // Enable range requests for video/audio
    maxAge: 3600, // Cache for 1 hour
    etag: true, // Enable ETag for conditional requests
  }),
);

// Perfect for video/audio streaming with seeking support
```

### Custom Prefix and Caching

```typescript
const app = createKori().applyPlugin(
  staticFilePlugin({
    serveFrom: './assets',
    mountAt: '/assets',
    maxAge: 3600, // 1 hour cache
    etag: true,
    lastModified: true,
    ranges: true, // Support partial downloads
  }),
);

// Serves files from ./assets/ at /assets/*
// With 1-hour caching, ETag support, and range requests
```

### Multiple Index Files

```typescript
const app = createKori().applyPlugin(
  staticFilePlugin({
    serveFrom: './public',
    index: ['index.html', 'index.htm', 'default.html'],
  }),
);

// Tries index files in order when accessing directories
```

### Dotfiles Configuration

```typescript
// Deny dotfiles (default)
staticFilePlugin({
  serveFrom: './public',
  dotfiles: 'deny', // .env, .git/ → 404 Not Found
});

// Allow dotfiles
staticFilePlugin({
  serveFrom: './public',
  dotfiles: 'allow', // .env, .git/ → served normally
});
```

## Path Resolution

The plugin handles URL-to-file mapping as follows:

```text
URL: /static/admin/dashboard.html
Source: ./public
Result: ./public/admin/dashboard.html

URL: /static/admin/
Source: ./public
Index: ['index.html']
Result: ./public/admin/index.html (if exists)

URL: /static/
Source: ./public
Index: ['index.html']
Result: ./public/index.html (if exists)
```

## MIME Types

Automatic content-type detection for common file types:

| Extension         | MIME Type                  |
| ----------------- | -------------------------- |
| `.html`, `.htm`   | `text/html`                |
| `.css`            | `text/css`                 |
| `.js`, `.mjs`     | `text/javascript`          |
| `.png`            | `image/png`                |
| `.jpg`, `.jpeg`   | `image/jpeg`               |
| `.gif`            | `image/gif`                |
| `.svg`            | `image/svg+xml`            |
| `.woff`, `.woff2` | `font/woff`, `font/woff2`  |
| `.pdf`            | `application/pdf`          |
| `.json`           | `application/json`         |
| (others)          | `application/octet-stream` |

## Security Features

### Path Traversal Protection

The plugin prevents directory traversal attacks:

```text
// These requests are blocked with 404 Not Found
GET /static/../../../etc/passwd
GET /static/%2e%2e%2f%2e%2e%2fetc%2fpasswd
GET /static/..%5c..%5cetc%5cpasswd
```

### Dotfiles Handling

Control access to dotfiles (files/directories starting with `.`):

- **`deny`** (default): Return 404 Not Found
- **`allow`**: Serve normally

### Safe Path Resolution

All paths are resolved and validated to ensure they remain within the configured source directory.

## Caching

### HTTP Cache Headers

```typescript
staticFilePlugin({
  serveFrom: './public',
  maxAge: 3600, // Cache-Control: public, max-age=3600
  etag: true, // ETag: "1234567890abcdef"
  lastModified: true, // Last-Modified: Wed, 21 Oct 2015 07:28:00 GMT
});
```

### Conditional Requests

Supports `If-None-Match` header for efficient caching:

```http
GET /static/style.css
ETag: "abc123"

GET /static/style.css
If-None-Match: "abc123"
→ 304 Not Modified (empty body)
```

## Error Handling

The plugin returns appropriate HTTP status codes:

- **200 OK**: File served successfully
- **304 Not Modified**: Conditional request, content unchanged
- **403 Forbidden**: Directory listing disabled
- **404 Not Found**: File not found, path traversal attempt, or denied dotfile

Error responses include JSON body:

```json
{
  "error": "Not Found",
  "message": "File not found"
}
```

## Performance Notes

- **Streaming**: Files are streamed directly without buffering
- **ETag Generation**: Based on file modification time and size (fast)
- **Path Validation**: Optimized for security without performance penalty
- **MIME Detection**: Efficient extension-based lookup

## Node.js Compatibility

- **Node.js**: >= 18.0.0
- **File System**: Uses `node:fs/promises` and streaming APIs
- **Path Handling**: Uses `node:path` for cross-platform compatibility

## Integration with Other Middleware

The static file plugin works well with other Kori plugins:

```typescript
import { createKori } from '@korix/kori';
import { corsPlugin } from '@korix/cors-plugin';
import { securityHeadersPlugin } from '@korix/security-headers-plugin';
import { staticFilePlugin } from '@korix/static-file-plugin-nodejs';

const app = createKori()
  .applyPlugin(
    corsPlugin({
      origin: true,
    }),
  )
  .applyPlugin(securityHeadersPlugin())
  .applyPlugin(
    staticFilePlugin({
      serveFrom: './public',
      maxAge: 3600,
    }),
  )
  .get('/api/health', (ctx) => ctx.res.json({ status: 'ok' }));
```

## License

MIT
