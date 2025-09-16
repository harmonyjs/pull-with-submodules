/**
 * @fileoverview Retry logic with exponential backoff for resilient async operations.
 *
 * Provides configurable retry mechanism for handling transient failures
 * in network requests, API calls, and other potentially unstable operations.
 */

/**
 * Configuration for retry operations.
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  readonly maxAttempts: number;
  /** Initial delay in milliseconds (default: 1000) */
  readonly initialDelay: number;
  /** Multiplier for exponential backoff (default: 2) */
  readonly backoffMultiplier: number;
  /** Maximum delay cap in milliseconds (default: 10000) */
  readonly maxDelay: number;
}

/**
 * Default retry configuration values optimized for transient failures:
 * - 3 attempts: standard for network/API failures without excessive delays
 * - 1s initial delay: allows temporary issues to resolve
 * - 2x backoff: exponential progression (1s → 2s → 4s)
 * - 10s max delay: prevents frustrating long waits
 */
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_INITIAL_DELAY = 1000;
const DEFAULT_BACKOFF_MULTIPLIER = 2;
const DEFAULT_MAX_DELAY = 10_000;

/**
 * Default retry configuration with sensible defaults.
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: DEFAULT_MAX_ATTEMPTS,
  initialDelay: DEFAULT_INITIAL_DELAY,
  backoffMultiplier: DEFAULT_BACKOFF_MULTIPLIER,
  maxDelay: DEFAULT_MAX_DELAY,
};

/**
 * Executes an async operation with exponential backoff retry.
 *
 * @param operation - The async operation to retry
 * @param config - Retry configuration options
 * @returns Promise resolving to the operation result
 * @throws The last error if all retry attempts fail
 *
 * @example
 * ```typescript
 * const result = await retry(
 *   () => fetchData(url),
 *   { maxAttempts: 5, initialDelay: 500 }
 * );
 * ```
 */
export async function retry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const { maxAttempts, initialDelay, backoffMultiplier, maxDelay } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: unknown = new Error("No attempts made");
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}
