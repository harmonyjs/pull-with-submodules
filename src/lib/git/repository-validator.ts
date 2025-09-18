/**
 * @fileoverview Git repository validation utilities.
 *
 * Provides functions for validating whether directories contain
 * valid Git repositories with proper caching support.
 */

import { simpleGit } from "simple-git";
import { isDirectory } from "#lib/fs/index.js";
import type { RepositoryCache } from "./cache.js";

/**
 * Check if a directory is a valid Git repository using git commands.
 *
 * Uses `git rev-parse --git-dir` for proper validation instead of just
 * checking for .git directory existence. This approach works for all
 * repository types including bare repositories. Supports caching for performance.
 *
 * @param repoPath - Absolute path to check
 * @param cache - Optional cache instance for validation results
 * @returns True if the directory contains a valid Git repository
 * @example
 * ```ts
 * const cache = new InMemoryRepositoryCache();
 * const isValid = await isGitRepository('/path/to/repo', cache);
 * ```
 */
export async function isGitRepository(
  repoPath: string,
  cache?: RepositoryCache,
): Promise<boolean> {
  const cached = cache?.get(repoPath);
  if (cached !== undefined) {
    return cached;
  }

  let isValid = false;

  // Check if the path exists and is a directory first
  if (await isDirectory(repoPath)) {
    try {
      // Use git rev-parse --git-dir for proper validation
      // This works for all repository types including bare repos
      const git = simpleGit(repoPath);
      await git.raw(["rev-parse", "--git-dir"]);
      isValid = true;
    } catch {
      // Any git error means it's not a valid repository
      isValid = false;
    }
  }

  cache?.set(repoPath, isValid);
  return isValid;
}
