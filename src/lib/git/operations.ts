/**
 * @fileoverview High-level Git operations with dry-run support.
 *
 * Provides Git operations for pull, fetch, commit resolution, and status checks
 * with built-in dry-run mode and verbose logging.
 */

import { asGitSha } from "./sha-utils.js";
import { createGit, type GitOperationConfig } from "./core.js";
import { type PullResult, processRepositoryStatus } from "./pull-status.js";
import type { GitSha } from "#types/git";

// Re-export types from pull-status module for convenience
export type { PullStatus, PullResult } from "./pull-status.js";

/**
 * Handles dry-run mode for pull operations by simulating pull without I/O operations.
 *
 * This function performs NO actual git operations to avoid the following issues:
 * - Network timeouts that would cause spinners to show as failed
 * - File system permission errors in restricted environments
 * - Git authentication failures during preview mode
 * - Unnecessary resource consumption for preview-only operations
 *
 * Returns a simulated result representing a typical up-to-date repository state.
 */
function handleDryRunPull(config: GitOperationConfig): PullResult {
  const callbacks = config.callbacks || {};

  // Simulate progress without actual operations
  callbacks.onProgress?.("Would fetch from origin (dry-run)");
  callbacks.onProgress?.("Would check repository status (dry-run)");

  // Return simulated result - up-to-date repository
  callbacks.onSuccess?.("Repository status check skipped (dry-run mode)");

  return {
    status: "up-to-date",
    changes: 0,
    insertions: 0,
    deletions: 0,
    files: [],
  };
}

/**
 * Pull with rebase from remote repository.
 *
 * @param config - Git operation configuration
 * @returns Promise resolving to pull result
 * @throws Error if pull fails or conflicts occur
 *
 * @example
 * ```typescript
 * const result = await pullWithRebase({ cwd: '/path/to/repo' });
 * console.log(`${result.changes} files changed`);
 * ```
 */
// eslint-disable-next-line complexity -- Complexity increased after inlining micro-functions to eliminate parameter drilling
export async function pullWithRebase(
  config: GitOperationConfig = {},
): Promise<PullResult> {
  config.logger?.verbose(`pull --rebase in ${config.cwd ?? process.cwd()}`);

  if (config.dryRun === true) {
    return Promise.resolve(handleDryRunPull(config));
  }

  const callbacks = config.callbacks || {};
  const git = createGit(config);

  try {
    callbacks.onProgress?.("Executing git pull --rebase...");
    const pullResult = await git.pull(["--rebase"]);

    // If pull brought no changes, check ahead/behind status for accurate reporting
    if (pullResult.summary.changes === 0) {
      const status = await git.status();

      // Use processRepositoryStatus for accurate status determination
      const repositoryStatus = processRepositoryStatus(
        { ahead: status.ahead, behind: status.behind },
        callbacks,
      );

      config.logger?.verbose(
        `Pull completed: 0 changes, ahead: ${status.ahead}, behind: ${status.behind}`,
      );
      return repositoryStatus;
    }

    // If pull brought changes, return standard result
    const pullResultTyped: PullResult = {
      status: "rebase-applied",
      changes: pullResult.summary.changes,
      insertions: pullResult.summary.insertions,
      deletions: pullResult.summary.deletions,
      files: pullResult.files,
    };

    callbacks.onSuccess?.(
      `Pull completed: ${pullResult.summary.changes} changes`,
    );
    config.logger?.verbose(
      `Pull completed: ${pullResult.summary.changes} changes`,
    );

    return pullResultTyped;
  } catch (error) {
    // Handle errors with conflict detection
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("conflict")) {
      callbacks.onError?.("Rebase conflicts detected");
      throw new Error(`Rebase conflicts detected: ${errorMessage}`);
    }

    callbacks.onError?.(`Pull failed: ${errorMessage}`);
    throw new Error(`Pull with rebase failed: ${errorMessage}`);
  }
}

/**
 * Fetch from all remotes.
 *
 * @param config - Git operation configuration
 * @returns Promise that resolves when fetch completes
 * @throws Error if fetch fails
 *
 * @example
 * ```typescript
 * await fetchRemotes({ cwd: '/path/to/repo' });
 * ```
 */
// eslint-disable-next-line complexity -- Complexity increased after inlining micro-functions to eliminate parameter drilling
export async function fetchRemotes(
  config: GitOperationConfig = {},
): Promise<void> {
  config.logger?.verbose(`fetch in ${config.cwd ?? process.cwd()}`);

  if (config.dryRun === true) {
    config.logger?.verbose("Fetch remotes (dry-run)");
    return;
  }

  const callbacks = config.callbacks || {};
  const git = createGit(config);

  try {
    // Execute fetch directly
    callbacks.onProgress?.("Fetching from all remotes...");
    await git.fetch();
    callbacks.onSuccess?.("Fetch completed");
    config.logger?.verbose("Fetch completed");
  } catch (error) {
    // Handle fetch errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    callbacks.onError?.(`Fetch failed: ${errorMessage}`);
    throw new Error(`Fetch failed: ${errorMessage}`);
  }
}

/**
 * Get commit SHA for a git reference.
 *
 * @param ref - Git reference (branch, tag, SHA)
 * @param config - Git operation configuration
 * @returns Promise resolving to commit SHA or null if reference not found
 *
 * @example
 * ```typescript
 * const sha = await getCommitSha('main', { cwd: '/path/to/repo' });
 * ```
 */
export async function getCommitSha(
  ref: string,
  config: GitOperationConfig = {},
): Promise<GitSha | null> {
  if (ref.trim() === "") {
    throw new Error("Git reference cannot be empty");
  }

  const git = createGit(config);

  try {
    const sha = await git.revparse([ref]);
    config.logger?.debug(`Resolved ${ref} to ${sha}`);
    return asGitSha(sha);
  } catch (error) {
    const errorString = error instanceof Error ? error.message : String(error);
    config.logger?.debug(`Failed to resolve ${ref}: ${errorString}`);
    return null;
  }
}

/**
 * Get working tree status.
 *
 * getWorkingTreeStatus has been moved to status-utils.ts with an enhanced interface.
 * Import from "#lib/git/status-utils" for the new WorkingTreeStatus interface.
 */
