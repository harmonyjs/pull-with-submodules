/**
 * @fileoverview Type guards and unions for application errors (relocated to src/errors/).
 */
import { GitOperationError } from "./git-operation.js";
import { NetworkError } from "./network.js";

/** Union type of all application-specific error classes */
export type AppError = GitOperationError | NetworkError;

/**
 * Type guard to check if a value is any application-specific error.
 *
 * @param err - The value to check
 * @returns True if the value is an AppError (GitOperationError or NetworkError), false otherwise
 * @example
 * ```ts
 * try {
 *   // some operation that might throw
 * } catch (error) {
 *   if (isAppError(error)) {
 *     // error is now typed as AppError
 *     console.log(`${error.code}: ${error.message}`);
 *     if (error.suggestions) {
 *       console.log('Suggestions:', error.suggestions);
 *     }
 *   }
 * }
 * ```
 */
export function isAppError(err: unknown): err is AppError {
  return err instanceof GitOperationError || err instanceof NetworkError;
}

export { type ErrorCode } from "./types.js";
