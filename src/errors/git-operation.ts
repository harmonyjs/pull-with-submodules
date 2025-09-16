/**
 * @fileoverview GitOperationError concrete subclass (relocated to src/errors/).
 */
import { BaseAppError, type AppErrorOptions } from "./base.js";

/**
 * Error thrown when Git operations fail (clone, pull, rebase, etc.).
 *
 * Use this error for any Git-related failures that can provide actionable
 * feedback to users, such as merge conflicts or authentication issues.
 *
 * @example
 * ```ts
 * throw new GitOperationError('Rebase failed due to conflicts', {
 *   cause: conflictError,
 *   suggestions: ['Resolve conflicts manually', 'Run git rebase --continue'],
 *   details: { conflictedFiles: ['src/file.ts'] }
 * });
 * ```
 */
export class GitOperationError extends BaseAppError {
  /**
   * Creates a new Git operation error.
   *
   * @param message - Description of the Git operation that failed
   * @param opts - Error options excluding the code (automatically set to 'GIT_OPERATION')
   */
  constructor(message: string, opts: Omit<AppErrorOptions, "code">) {
    super(message, { ...opts, code: "GIT_OPERATION" });
  }

  /**
   * Type guard to check if a value is a GitOperationError instance.
   *
   * @param value - The value to check
   * @returns True if the value is a GitOperationError, false otherwise
   * @example
   * ```ts
   * try {
   *   // some git operation
   * } catch (error) {
   *   if (GitOperationError.is(error)) {
   *     console.log('Git operation failed:', error.message);
   *   }
   * }
   * ```
   */
  static is(value: unknown): value is GitOperationError {
    return value instanceof GitOperationError;
  }
}
