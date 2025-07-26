import { type Stats } from 'node:fs';
import { stat as statAsync } from 'node:fs/promises';

/**
 * Get file stats with error handling
 */
export async function getFileStats(filePath: string): Promise<
  | {
      success: true;
      stats: Stats;
    }
  | {
      success: false;
      error: unknown;
    }
> {
  try {
    const stats = await statAsync(filePath);
    return { success: true, stats };
  } catch (error) {
    return { success: false, error };
  }
}
