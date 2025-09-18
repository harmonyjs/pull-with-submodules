/**
 * @fileoverview Helper functions and utilities for submodule processing.
 *
 * Provides convenience functions for common operations, normalization,
 * and shared utilities used across the submodule processing system.
 */

import type { Submodule } from "#types/core.js";
import type { SubmoduleEntry } from "#lib/git/gitmodules.js";
import { createGit } from "#lib/git/core.js";
import { asGitSha } from "#lib/git/sha-utils.js";
import type { GitSha } from "#types/git.js";

/**
 * Normalizes submodule entry from .gitmodules to domain model.
 */
export function normalizeSubmoduleEntry(entry: SubmoduleEntry): Submodule {
  const result: Submodule = {
    name: entry.name,
    path: entry.path,
  };

  if (entry.branch !== undefined) {
    return { ...result, branch: entry.branch };
  }

  return result;
}

/**
 * Creates a current SHA getter function for a submodule path.
 */
export function createCurrentShaGetter(
  submodulePath: string,
  onError?: (error: unknown) => void,
): () => Promise<GitSha | undefined> {
  return async () => {
    try {
      const git = createGit({ cwd: submodulePath });
      const result = await git.raw("rev-parse", "--verify", "HEAD^{commit}");
      const sha = result.trim();
      return asGitSha(sha);
    } catch (error) {
      if (onError) {
        onError(error);
      }
      return undefined;
    }
  };
}

/**
 * Safely extracts error message from unknown error object.
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Checks if a value is a valid SHA string.
 *
 * @param value - Value to check
 * @returns true if value is non-null, non-undefined, and non-empty string
 */
export function isValidSha(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && value !== "";
}
