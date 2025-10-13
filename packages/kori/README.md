# @korix/kori

Core framework package for Kori.

For documentation and examples, see:
- [GitHub Repository](https://github.com/bufferings/kori)
- [Documentation](https://bufferings.github.io/kori)

## Installation

```bash
npm install @korix/kori
```

## Quick Example

```typescript
import { createKori } from '@korix/kori';

const app = createKori().get('/hello', (ctx) => {
  return ctx.res.json({ message: 'Hello, World!' });
});
```

For more examples and detailed usage, visit the [documentation](https://bufferings.github.io/kori).
