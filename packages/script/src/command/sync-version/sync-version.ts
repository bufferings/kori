import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

export async function syncVersion(filePath = 'version.ts'): Promise<void> {
  const cwd = process.cwd();
  const packageJsonPath = join(cwd, 'package.json');
  const srcDir = join(cwd, 'src');
  const versionFilePath = join(srcDir, filePath);
  const versionFileDir = dirname(versionFilePath);

  // Read package.json
  try {
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');

    let packageJson: { version?: unknown };
    try {
      packageJson = JSON.parse(packageJsonContent) as { version?: unknown };
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        throw new Error(`Invalid JSON in package.json: ${parseError.message}`);
      }
      throw parseError;
    }

    const version = packageJson.version;
    if (typeof version !== 'string') {
      throw new Error('No version found in package.json');
    }

    // Create directory if it doesn't exist (including nested directories)
    if (!existsSync(versionFileDir)) {
      await mkdir(versionFileDir, { recursive: true });
    }

    const versionContent = `export const PLUGIN_VERSION = ${JSON.stringify(version)};\n`;

    // Check if version file exists and has the same content
    if (existsSync(versionFilePath)) {
      const existingContent = await readFile(versionFilePath, 'utf-8');
      if (existingContent === versionContent) {
        console.log(`Version ${version} is already up to date in src/${filePath}`);
        return;
      }
    }

    // Write version file
    await writeFile(versionFilePath, versionContent, 'utf-8');
    console.log(`Synced version ${version} to src/${filePath}`);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error('package.json not found in current directory');
    }
    throw error;
  }
}
