# @korix/script

Development CLI scripts for the Kori framework.

This is an internal tool used for development tasks across the Kori monorepo.

## Usage

The CLI is available as `ks` command:

```bash
ks <command>
```

## Commands

### `sync-version`

Synchronizes the package version from `package.json` to a TypeScript version file.

```bash
ks sync-version [file-path]
```

Arguments:
- `file-path` - Optional. Target file path relative to `src/` (default: `version.ts`)

Example:
```bash
# Sync to src/version.ts (default)
ks sync-version

# Sync to custom file
ks sync-version version/version.ts
```

### `lint-staged`

Runs ESLint on staged files in parallel, optimized for the Kori monorepo.

This command is designed to work with Git hooks (via lefthook) and provides:

- Monorepo-aware linting: Groups staged files by package and runs ESLint with each package's own `eslint.config.js`
- Parallel execution: Runs ESLint in multiple packages simultaneously based on available CPU cores
- Efficiency: Each package lints only its relevant files independently

```bash
ks lint-staged [files...]
```

Arguments:
- `files...` - List of files to lint (typically provided by lefthook's `{staged_files}`)

Example:
```bash
# Typically called from lefthook
ks lint-staged src/index.ts packages/kori/src/plugin.ts

# Each package's files are linted separately with its own ESLint config
```

Why not use the `lint-staged` npm package?

This custom implementation is specifically optimized for the Kori monorepo structure, where each package has its own ESLint configuration and needs to be linted independently in parallel for better performance.

## License

MIT
