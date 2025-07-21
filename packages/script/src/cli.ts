#!/usr/bin/env node

import { lintStaged, syncVersion } from './command/index.js';

function printUsage(): void {
  console.log('Usage: ks <command>');
  console.log('Commands:');
  console.log('  sync-version');
  console.log('  lint-staged');
}

async function main(): Promise<void> {
  const command = process.argv[2];

  switch (command) {
    case 'sync-version':
      await syncVersion();
      break;

    case 'lint-staged': {
      const files = process.argv.slice(3);
      await lintStaged(files);
      break;
    }

    case '--help':
    case '-h':
      printUsage();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
