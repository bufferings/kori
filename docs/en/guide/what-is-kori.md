# What is Kori?

Kori is a modern TypeScript web framework that makes building APIs **safe, fast, and enjoyable**.

Think of it as a framework that **prevents bugs before they happen** while automatically generating beautiful documentation for your APIs.

## What Makes Kori Special?

### 🛡️ **Built-in Safety**

Write your API once, and Kori ensures everything works correctly:

```typescript
import { z } from 'zod/v4';

// Define your data structure
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

// Kori automatically:
// ✅ Validates incoming requests
// ✅ Generates TypeScript types
// ✅ Creates API documentation
// ✅ Handles errors gracefully
```

### 🚀 **Zero Maintenance Documentation**

Your code **IS** your documentation. No more outdated docs:

- Write schemas → Get interactive API docs
- Change your code → Documentation updates automatically
- Share with frontend teams → They get exact TypeScript types

### 🧩 **Start Small, Scale Smart**

Kori grows with your project:

- **Tiny core** - Only what you need
- **Plugin ecosystem** - Add features when needed
- **Runtime flexible** - Deploy anywhere (Node.js, Bun, Deno, Cloudflare)

## How It Works

Every Kori app follows a simple pattern:

```
Request → Validation → Your Code → Response
```

Kori handles the complex parts (validation, types, docs) so you focus on **building features**.

## Perfect For

- **API-first teams** who want bulletproof backends
- **TypeScript lovers** who hate manual type casting
- **Fast-moving projects** that need reliable documentation
- **Full-stack developers** building modern web apps

## The Kori Advantage

Other frameworks make you choose: **fast development** OR **production safety**.

Kori gives you both. Write TypeScript schemas once, get validation, types, and documentation automatically.

## Ready to Try?

Get your first API running in under 5 minutes with our [Getting Started Guide](/en/guide/getting-started).

Or explore what's possible with our [examples](/en/examples/) and [interactive demos](/en/extensions/).
