#!/usr/bin/env node

import { syncVersion } from './commands/index.js';

function printUsage() {
  console.log('Usage: kori-scripts <command>');
  console.log('');
  console.log('Commands:');
  console.log('  sync-version  Sync package.json version to src/version.ts');
  console.log('');
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'sync-version':
      try {
        await syncVersion();
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
      break;

    case '--help':
    case '-h':
    case undefined:
      printUsage();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main();
