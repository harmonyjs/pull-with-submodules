/**
 * @fileoverview Parallel execution with concurrency limits using p-limit.
 *
 * Provides controlled parallel execution to balance performance with
 * resource utilization and system responsiveness.
 */

import pLimit from "p-limit";

/**
 * Result of a parallel operation execution.
 */
export type ParallelResult<T> =
  | {
      /** The resolved value */
      readonly value: T;
      /** Execution duration in milliseconds */
      readonly duration: number;
      /** Operation succeeded */
      readonly success: true;
    }
  | {
      /** Execution duration in milliseconds */
      readonly duration: number;
      /** Operation failed */
      readonly success: false;
      /** Error details */
      readonly error: Error;
    };

/** Default concurrency balances resource utilization with system responsiveness */
const DEFAULT_CONCURRENCY = 4;

/**
 * Creates a parallel runner with concurrency limit using p-limit.
 *
 * @param concurrency - Maximum number of concurrent operations
 * @returns Function to execute operations with controlled concurrency
 *
 * @example
 * ```typescript
 * const runParallel = createParallelRunner(2);
 * const results = await runParallel([
 *   () => processSubmodule('path1'),
 *   () => processSubmodule('path2'),
 *   () => processSubmodule('path3')
 * ]);
 * ```
 */
export function createParallelRunner<T>(
  concurrency = DEFAULT_CONCURRENCY,
): (operations: Array<() => Promise<T>>) => Promise<Array<ParallelResult<T>>> {
  const limit = pLimit(concurrency);

  return async function runParallel(
    operations: Array<() => Promise<T>>,
  ): Promise<Array<ParallelResult<T>>> {
    const tasks = operations.map((operation) =>
      limit(async (): Promise<ParallelResult<T>> => {
        const startTime = Date.now();

        try {
          const value = await operation();
          const duration = Date.now() - startTime;

          return {
            value,
            duration,
            success: true,
          };
        } catch (error) {
          const duration = Date.now() - startTime;

          return {
            duration,
            success: false,
            error:
              error instanceof Error
                ? error
                : new Error(String(error), { cause: error }),
          };
        }
      }),
    );

    return Promise.all(tasks);
  };
}
