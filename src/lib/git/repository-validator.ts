/**
 * @fileoverview Git repository validation utilities.
 *
 * Provides functions for validating whether directories contain
 * valid Git repositories with proper caching support.
 */

import { simpleGit } from "simple-git";
import { isDirectory } from "../fs/index.js";
import type { RepositoryCache } from "./cache.js";
import type { GitOperations } from "../../types/git.js";

/**
 * Check if a directory is a valid Git repository using git commands.
 *
 * Uses `git rev-parse --git-dir` for proper validation instead of just
 * checking for .git directory existence. Supports caching for performance.
 *
 * @param repoPath - Absolute path to check
 * @param cache - Optional cache instance for validation results
 * @param gitOps - Optional GitOperations instance for better testability
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
  gitOps?: GitOperations,
): Promise<boolean> {
  const cached = cache?.get(repoPath);
  if (cached !== undefined) {
    return cached;
  }

  let isValid = false;

  // Check if the path exists and is a directory first
  if (await isDirectory(repoPath)) {
    try {
      if (gitOps) {
        // Use GitOperations for better testability
        try {
          await gitOps.getCurrentBranch(repoPath);
          isValid = true;
        } catch {
          isValid = false;
        }
      } else {
        // Use git rev-parse --git-dir for proper validation
        const git = simpleGit(repoPath);
        await git.raw(["rev-parse", "--git-dir"]);
        isValid = true;
      }
    } catch {
      // Any git error means it's not a valid repository
      isValid = false;
    }
  }

  cache?.set(repoPath, isValid);
  return isValid;
}
