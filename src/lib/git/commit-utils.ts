/**
 * @fileoverview Git commit resolution utilities.
 *
 * Provides functions for resolving commit SHAs from branch references
 * with proper error handling for Git operations.
 */

import { getCommitSha as getCoreCommitSha } from "./operations.js";
import type { GitOperationConfig } from "./core.js";
import type { GitSha } from "#types/git.js";

/**
 * Get commit SHA for a branch in a repository.
 *
 * Safely handles errors by returning null when branch doesn't exist,
 * while preserving other error types that might indicate system issues.
 *
 * @param repoPath - Absolute path to the Git repository
 * @param branch - Branch name to resolve
 * @param config - Optional git operation configuration
 * @returns Commit SHA if found, null if branch doesn't exist
 * @example
 * ```ts
 * const sha = await getCommitSha('/path/to/repo', 'main');
 * if (sha) {
 *   console.log('Branch main is at:', sha);
 * }
 * ```
 */
export async function getCommitSha(
  repoPath: string,
  branch: string,
  config?: GitOperationConfig,
): Promise<GitSha | null> {
  const gitConfig: GitOperationConfig = {
    cwd: repoPath,
    timeout: config?.timeout,
    dryRun: config?.dryRun,
    verbose: config?.verbose,
    logger: config?.logger,
  };
  return getCoreCommitSha(branch, gitConfig);
}
