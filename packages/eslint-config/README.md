# @korix/eslint-config

Shared ESLint configuration for the Kori framework.

## Installation

```bash
npm install --save-dev @korix/eslint-config
```

## Usage

This package provides two configurations:

### `baseConfig`

Base ESLint configuration with TypeScript, Prettier, and import sorting.

```javascript
// eslint.config.js
import { baseConfig } from '@korix/eslint-config';

export default baseConfig;
```

### `koriConfig`

Extended configuration with Kori-specific custom rules (recommended for Kori framework development).

```javascript
// eslint.config.js
import { koriConfig } from '@korix/eslint-config';

export default koriConfig;
```

## Features

- TypeScript support with recommended type-checked rules
- Prettier integration
- Import sorting and organization
- Unused import detection
- Custom Kori-specific rules:
  - `ascii-only-source` - Enforce ASCII-only source code
  - `no-duplicate-export-from` - Prevent duplicate export declarations
  - `no-index-imports` - Disallow imports from index files
  - `no-barrel-internal` - Prevent internal exports in barrel files

## License

MIT
