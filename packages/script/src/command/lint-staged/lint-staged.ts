import { existsSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { relative, resolve as pathResolve } from 'node:path';

import { execaNode } from 'execa';
import pLimit from 'p-limit';

type PackageFiles = Map<string, string[]>;

/**
 * Group files by package directory
 */
function groupFilesByPackage(files: string[]): PackageFiles {
  const packageGroups: PackageFiles = new Map();

  for (const file of files) {
    const packageDir = findPackageDir(file);

    if (!packageGroups.has(packageDir)) {
      packageGroups.set(packageDir, []);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    packageGroups.get(packageDir)!.push(file);
  }

  return packageGroups;
}

/**
 * Find the package directory that contains the given file
 */
function findPackageDir(file: string): string {
  // Resolve the path to get a consistent absolute path, then make it relative to the project root.
  const normalizedFile = relative(process.cwd(), pathResolve(file));

  // Check if file is in packages/ directory
  const packageMatch = /^packages\/([^/]+)/.exec(normalizedFile);
  if (packageMatch) {
    return `packages/${packageMatch[1]}`;
  }

  // Root directory file
  return '.';
}

/**
 * Check if the specified directory has eslint.config.js
 */
function hasEslintConfig(packageDir: string): boolean {
  const eslintConfigPath = pathResolve(packageDir, 'eslint.config.js');
  return existsSync(eslintConfigPath);
}

/**
 * Run ESLint in the specified package using a child process
 */
async function runEslint(packageDir: string, files: string[]): Promise<void> {
  const packagePath = pathResolve(process.cwd(), packageDir);

  const relativeFiles = files.map((file) => {
    const absolutePath = pathResolve(process.cwd(), file);
    return relative(packagePath, absolutePath);
  });

  const targetFiles = relativeFiles.filter((file) => /\.(ts|tsx|js|jsx)$/.test(file));

  if (targetFiles.length === 0) {
    return Promise.resolve();
  }

  const lintLabel = `Lint completed for ${packageDir}`;
  console.time(lintLabel);
  try {
    await execaNode('node_modules/eslint/bin/eslint.js', ['--fix', ...targetFiles], {
      cwd: packagePath,
      stdio: 'inherit',
    });
  } catch (err: unknown) {
    throw new Error(`ESLint failed in ${packageDir}`, { cause: err });
  } finally {
    console.timeEnd(lintLabel);
  }
}

/**
 * Main function: lint staged files in each package
 */
export async function lintStaged(files: string[]): Promise<void> {
  if (files.length === 0) {
    console.log('No files to lint');
    return;
  }

  console.log(`Processing ${files.length} files...`);

  const concurrency = Math.max(1, availableParallelism() - 1);
  const limit = pLimit(concurrency);

  const packageGroups = groupFilesByPackage(files);
  const lintPromises: Promise<void>[] = [];

  for (const [packageDir, packageFiles] of packageGroups) {
    if (hasEslintConfig(packageDir)) {
      const task = limit(() => runEslint(packageDir, packageFiles));
      lintPromises.push(task);
    } else {
      console.log(`Skipping ${packageDir}: no eslint.config.js found`);
    }
  }

  if (lintPromises.length === 0) {
    console.log('No packages with ESLint config found');
    return;
  }

  const results = await Promise.allSettled(lintPromises);
  const failedTasks = results.filter((result) => result.status === 'rejected');

  if (failedTasks.length > 0) {
    throw new Error(`Linting failed in ${failedTasks.length} package(s). Please check the logs above for details.`);
  }

  console.log('All lint tasks completed successfully');
}
