/**
 * @fileoverview Sequential execution utilities for ordered async operations.
 *
 * Provides controlled sequential execution with optional delays between
 * operations for rate limiting and dependency management.
 */

import { delay } from "./timing.js";

/**
 * Executes operations sequentially with optional delay between each.
 *
 * @param operations - Array of async operations to execute in order
 * @param delayBetween - Optional delay in ms between operations
 * @returns Promise resolving to array of all results
 *
 * @example
 * ```typescript
 * const results = await sequential([
 *   () => updateSubmodule('path1'),
 *   () => updateSubmodule('path2')
 * ], 500); // 500ms delay between updates
 * ```
 */
export async function sequential<T>(
  operations: Array<() => Promise<T>>,
  delayBetween = 0,
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i];
    if (!operation) {
      throw new Error(`Operation at index ${i} is undefined`);
    }

    const result = await operation();
    results.push(result);

    if (delayBetween > 0 && i < operations.length - 1) {
      await delay(delayBetween);
    }
  }

  return results;
}
