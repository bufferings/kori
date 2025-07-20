import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function syncVersion(): Promise<void> {
  const cwd = process.cwd();
  const packageJsonPath = join(cwd, 'package.json');
  const srcDir = join(cwd, 'src');
  const versionFilePath = join(srcDir, 'version.ts');

  // Read package.json
  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    const version = packageJson.version;

    if (!version) {
      throw new Error('No version found in package.json');
    }

    // Create src directory if it doesn't exist
    if (!existsSync(srcDir)) {
      await mkdir(srcDir, { recursive: true });
    }

    const versionContent = `export const PLUGIN_VERSION = '${version}';\n`;

    // Check if version file exists and has the same content
    if (existsSync(versionFilePath)) {
      const existingContent = await readFile(versionFilePath, 'utf-8');
      if (existingContent === versionContent) {
        console.log(`Version ${version} is already up to date in src/version.ts`);
        return;
      }
    }

    // Write version file
    await writeFile(versionFilePath, versionContent, 'utf-8');
    console.log(`Synced version ${version} to src/version.ts`);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error('package.json not found in current directory');
    }
    throw error;
  }
}
