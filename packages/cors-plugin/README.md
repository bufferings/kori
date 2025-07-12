# @korix/cors-plugin

A CORS plugin for the Kori framework.

This plugin adds Cross-Origin Resource Sharing (CORS) support to your Kori applications.

## Installation

```bash
pnpm add @korix/cors-plugin
```

## Usage

```typescript
import { kori } from '@korix/kori';
import { corsPlugin } from '@korix/cors-plugin';

const app = kori();
app.use(corsPlugin());
```

## Testing Changesets

This line was added to test Changesets functionality.
