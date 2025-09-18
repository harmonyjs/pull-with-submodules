/**
 * @fileoverview Git commit resolution utilities.
 *
 * Provides functions for resolving commit SHAs from branch references
 * with proper error handling for Git operations.
 */

import { GitOperationError } from "../../errors/index.js";
import type { GitOperations, GitSha } from "../../types/git.js";

/**
 * Get commit SHA for a branch in a repository.
 *
 * Safely handles GitOperationError by returning null, while preserving
 * other error types that might indicate system issues.
 *
 * @param repoPath - Absolute path to the Git repository
 * @param branch - Branch name to resolve
 * @param gitOps - Git operations instance
 * @returns Commit SHA if found, null if branch doesn't exist
 * @throws Re-throws non-GitOperationError exceptions (network, system, etc.)
 * @example
 * ```ts
 * const sha = await getCommitSha('/path/to/repo', 'main', gitOps);
 * if (sha) {
 *   console.log('Branch main is at:', sha);
 * }
 * ```
 */
export async function getCommitSha(
  repoPath: string,
  branch: string,
  gitOps: GitOperations,
): Promise<GitSha | null> {
  try {
    return await gitOps.getCommitSha(repoPath, branch);
  } catch (error) {
    // Return null for expected Git errors (branch not found, etc.)
    if (error instanceof GitOperationError) {
      return null;
    }

    // Re-throw unexpected errors (network, filesystem, etc.)
    throw error;
  }
}
