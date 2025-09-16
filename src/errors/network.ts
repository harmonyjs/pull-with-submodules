/**
 * @fileoverview NetworkError concrete subclass (relocated to src/errors/).
 */
import { BaseAppError, type AppErrorOptions } from "./base.js";

/**
 * Error thrown when network operations fail (timeouts, DNS resolution, HTTP errors, etc.).
 *
 * Use this error for any network-related failures, such as connection timeouts,
 * DNS resolution failures, or HTTP status errors.
 *
 * @example
 * ```ts
 * throw new NetworkError('Failed to fetch remote repository', {
 *   cause: new Error('ETIMEDOUT'),
 *   suggestions: ['Check internet connection', 'Verify repository URL'],
 *   details: { url: 'https://github.com/user/repo.git', timeout: 30000 }
 * });
 * ```
 */
export class NetworkError extends BaseAppError {
  /**
   * Creates a new network error.
   *
   * @param message - Description of the network operation that failed
   * @param opts - Error options excluding the code (automatically set to 'NETWORK')
   */
  constructor(message: string, opts: Omit<AppErrorOptions, "code">) {
    super(message, { ...opts, code: "NETWORK" });
  }

  /**
   * Type guard to check if a value is a NetworkError instance.
   *
   * @param value - The value to check
   * @returns True if the value is a NetworkError, false otherwise
   * @example
   * ```ts
   * try {
   *   // some network operation
   * } catch (error) {
   *   if (NetworkError.is(error)) {
   *     console.log('Network operation failed:', error.message);
   *   }
   * }
   * ```
   */
  static is(value: unknown): value is NetworkError {
    return value instanceof NetworkError;
  }
}
