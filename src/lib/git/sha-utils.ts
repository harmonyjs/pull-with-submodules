/**
 * @fileoverview Git SHA validation and conversion utilities.
 *
 * Provides type-safe functions for working with Git SHA hashes, including
 * validation and type conversion with proper error handling.
 */

import { GitOperationError } from "../../errors/index.js";
import type { GitSha } from "../../types/git.js";

/**
 * Minimum length for a valid Git SHA hash.
 */
const MIN_SHA_LENGTH = 7;

/**
 * Maximum length for a valid Git SHA hash.
 */
const MAX_SHA_LENGTH = 40;

/**
 * Regular expression for validating Git SHA format.
 * Accepts both full (40 char) and abbreviated (7-40 char) SHA hashes.
 */
const SHA_REGEX = new RegExp(`^[a-f0-9]{${MIN_SHA_LENGTH},${MAX_SHA_LENGTH}}$`, "i");

/**
 * Validates if a string represents a valid Git SHA format.
 *
 * @param value - String to validate
 * @returns True if the string is a valid SHA format
 * @example
 * ```ts
 * isValidSha('a1b2c3d')     // true (7 chars)
 * isValidSha('a1b2c3d4e5f6789012345678901234567890abcd') // true (40 chars)
 * isValidSha('invalid')     // false
 * isValidSha('123')         // false (too short)
 * ```
 */
export function isValidSha(value: string): boolean {
  return SHA_REGEX.test(value);
}

/**
 * Type guard to check if an unknown value is a valid GitSha.
 *
 * @param value - Value to check
 * @returns True if the value is a valid GitSha
 * @example
 * ```ts
 * if (isGitSha(someValue)) {
 *   // someValue is now typed as GitSha
 *   console.log('Valid SHA:', someValue);
 * }
 * ```
 */
export function isGitSha(value: unknown): value is GitSha {
  return typeof value === "string" && isValidSha(value);
}

/**
 * Safely converts a string to GitSha with validation.
 *
 * @param sha - String that should represent a Git SHA
 * @returns The same string typed as GitSha
 * @throws {GitOperationError} When the string is not a valid SHA format
 * @example
 * ```ts
 * const commitSha = asGitSha('a1b2c3d4e5f6789'); // OK
 * const invalid = asGitSha('not-a-sha');         // Throws GitOperationError
 * ```
 */
export function asGitSha(sha: string): GitSha {
  if (!isValidSha(sha)) {
    throw new GitOperationError(`Invalid Git SHA format: ${sha}`, {
      details: {
        sha,
        expectedFormat: `${MIN_SHA_LENGTH}-${MAX_SHA_LENGTH} hexadecimal characters`
      },
      suggestions: [
        "Ensure SHA is a valid hexadecimal hash",
        "Check if the commit exists in the repository",
        "Use 'git log --oneline' to see valid commit SHAs",
      ],
    });
  }
  return sha as GitSha;
}
