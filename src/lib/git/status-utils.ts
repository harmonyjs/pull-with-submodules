/**
 * @fileoverview Git working tree status utilities.
 *
 * Contains utility functions for checking working tree status and
 * related Git operations.
 */

import { createGit, type GitOperationConfig } from "./core.js";

/**
 * Working tree status interface.
 */
export interface WorkingTreeStatus {
  /** True if working tree is clean */
  readonly clean: boolean;
  /** Number of staged files */
  readonly staged: number;
  /** Number of modified files */
  readonly modified: number;
  /** Number of untracked files */
  readonly untracked: number;
}

/**
 * Gets working tree status for a repository.
 *
 * @param config Git operation configuration
 * @returns Promise resolving to working tree status
 * @throws Error if unable to get status
 */
export async function getWorkingTreeStatus(
  config: GitOperationConfig = {},
): Promise<WorkingTreeStatus> {
  config.logger?.verbose(
    `git status --porcelain in ${config.cwd ?? process.cwd()}`,
  );

  const git = createGit(config);
  const status = await git.status();

  return {
    clean: status.isClean(),
    staged: status.staged.length,
    modified: status.modified.length,
    untracked: status.not_added.length,
  };
}
