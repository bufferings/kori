# WebSocket Example

Learn how to implement real-time communication in Kori using WebSockets. This example shows a simple chat server with basic broadcasting.

## Basic WebSocket Server

```typescript
import { createKori, HttpStatus } from '@korix/kori';
import { startNodeServer } from '@korix/nodejs-adapter';
import { zodRequestSchema } from '@korix/zod-schema';
import { createKoriZodRequestValidator } from '@korix/zod-validator';
import { z } from 'zod/v4';

// Simple in-memory storage
const connections = new Map<string, WebSocket>();
const messages: string[] = [];

const app = createKori({
  requestValidator: createKoriZodRequestValidator(),
});

// Serve simple chat page
app.get('/', {
  handler: (ctx) => {
    const html = `
<!DOCTYPE html>
<html>
<head><title>Kori WebSocket Chat</title></head>
<body>
    <div id="messages" style="height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 10px;"></div>
    <input id="input" type="text" placeholder="Type a message..." style="width: 70%; padding: 10px;">
    <button id="send" style="padding: 10px;">Send</button>

    <script>
        const ws = new WebSocket('ws://localhost:3000/ws/chat?name=User');
        const messages = document.getElementById('messages');
        const input = document.getElementById('input');

        ws.onmessage = (event) => {
            messages.innerHTML += '<div>' + event.data + '</div>';
            messages.scrollTop = messages.scrollHeight;
        };

        function send() {
            if (input.value.trim()) {
                ws.send(input.value);
                input.value = '';
            }
        }

        document.getElementById('send').onclick = send;
        input.onkeypress = (e) => e.key === 'Enter' && send();
    </script>
</body>
</html>`;
    return ctx.res.html(html);
  },
});

// WebSocket endpoint
app.get('/ws/chat', {
  requestSchema: zodRequestSchema({
    queries: z.object({
      name: z.string().min(1).max(50),
    }),
  }),
  handler: async (ctx) => {
    const { name } = ctx.req.validatedQueries();

    // Check for WebSocket upgrade
    const upgrade = ctx.req.header('upgrade');
    if (upgrade?.toLowerCase() !== 'websocket') {
      return ctx.res.badRequest({ message: 'WebSocket upgrade required' });
    }

    try {
      // Upgrade to WebSocket
      const { response, socket } = Deno.upgradeWebSocket(ctx.req.raw());
      const ws = socket;
      const userId = Math.random().toString(36).substring(7);

      ws.onopen = () => {
        connections.set(userId, ws);
        broadcast(`${name} joined the chat`);

        // Send recent messages
        messages.slice(-10).forEach((msg) => ws.send(msg));
      };

      ws.onmessage = (event) => {
        const message = `${name}: ${event.data}`;
        messages.push(message);
        broadcast(message);
      };

      ws.onclose = () => {
        connections.delete(userId);
        broadcast(`${name} left the chat`);
      };

      return new Response(null, { status: 101, webSocket: socket });
    } catch (error) {
      return ctx.res.internalError({ message: 'WebSocket upgrade failed' });
    }
  },
});

function broadcast(message: string) {
  connections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// API endpoints
app.get('/api/stats', {
  handler: (ctx) => {
    return ctx.res.json({
      connectedUsers: connections.size,
      totalMessages: messages.length,
    });
  },
});

// Start server
await startNodeServer(app, { port: 3000 });
console.log('🚀 WebSocket Server running on http://localhost:3000');
```

That's it! A complete WebSocket chat server in under 100 lines.

## Client-Side Usage

### Basic JavaScript Client

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/chat?name=Alice');

ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => console.log('Received:', event.data);
ws.onclose = () => console.log('Disconnected');

// Send messages
ws.send('Hello, World!');
```

### Node.js Client

```javascript
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000/ws/chat?name=NodeClient');

ws.on('open', () => {
  console.log('Connected');
  ws.send('Hello from Node.js!');
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
});
```

### React Hook

```typescript
import { useState, useEffect, useRef } from 'react';

function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => setIsConnected(true);
    ws.current.onclose = () => setIsConnected(false);

    return () => ws.current?.close();
  }, [url]);

  const send = (message: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(message);
    }
  };

  return { isConnected, send };
}

// Usage
function ChatComponent() {
  const { isConnected, send } = useWebSocket('ws://localhost:3000/ws/chat?name=User');

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={() => send('Hello!')}>Send Message</button>
    </div>
  );
}
```

## Real-Time Data Updates

```typescript
// Real-time notifications endpoint
app.get('/ws/updates', {
  handler: async (ctx) => {
    const upgrade = ctx.req.header('upgrade');
    if (upgrade?.toLowerCase() !== 'websocket') {
      return ctx.res.badRequest({ message: 'WebSocket upgrade required' });
    }

    const { response, socket } = Deno.upgradeWebSocket(ctx.req.raw());
    const ws = socket;

    ws.onopen = () => {
      // Send updates every 5 seconds
      const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              timestamp: new Date(),
              users: connections.size,
              messages: messages.length,
            }),
          );
        } else {
          clearInterval(interval);
        }
      }, 5000);
    };

    return new Response(null, { status: 101, webSocket: socket });
  },
});
```

## Testing WebSockets

### Using websocat

```bash
# Install websocat
cargo install websocat

# Connect and send messages
websocat "ws://localhost:3000/ws/chat?name=TestUser"
# Type messages and press Enter
```

### Using curl for HTTP endpoints

```bash
# Check stats
curl http://localhost:3000/api/stats

# Health check
curl http://localhost:3000/health
```

## Production Tips

### Rate Limiting

```typescript
const rateLimits = new Map<string, number>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const lastMessage = rateLimits.get(userId) || 0;

  if (now - lastMessage < 1000) {
    // 1 message per second
    return false;
  }

  rateLimits.set(userId, now);
  return true;
}
```

### Connection Health

```typescript
// Ping connections periodically
setInterval(() => {
  connections.forEach((ws, userId) => {
    if (ws.readyState !== WebSocket.OPEN) {
      connections.delete(userId);
    }
  });
}, 30000);
```

### Authentication

```typescript
app.get('/ws/secure', {
  requestSchema: zodRequestSchema({
    queries: z.object({
      token: z.string(),
    }),
  }),
  handler: async (ctx) => {
    const { token } = ctx.req.validatedQueries();

    // Verify JWT token
    try {
      const user = verifyToken(token);
      // Proceed with WebSocket upgrade...
    } catch {
      return ctx.res.unauthorized({ message: 'Invalid token' });
    }
  },
});
```

## What You've Learned

- ✅ Basic WebSocket server setup with Kori
- ✅ Client-side WebSocket connections
- ✅ Real-time broadcasting
- ✅ React integration patterns
- ✅ Production considerations

## Next Steps

- [REST API Example](/en/examples/rest-api) - Build HTTP APIs
- [File Upload Example](/en/examples/file-upload) - Handle file uploads
- [Validation Guide](/en/guide/validation) - Add type-safe validation
- [Plugins Guide](/en/guide/plugins) - Extend WebSocket functionality

For more advanced WebSocket patterns (rooms, persistence, scaling), check our [Advanced WebSocket Guide](/en/extensions/) (coming soon).
