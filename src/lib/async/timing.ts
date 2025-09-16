/**
 * @fileoverview Timing utilities for async operations.
 *
 * Provides simple delay functions for rate limiting, testing,
 * and controlled timing in async workflows.
 */

/**
 * Creates a function that delays execution by the specified milliseconds.
 *
 * @param ms - Delay in milliseconds
 * @returns Promise that resolves after the delay
 *
 * @example
 * ```typescript
 * await delay(1000); // Wait 1 second
 * ```
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
