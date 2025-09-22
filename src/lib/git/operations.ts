/**
 * @fileoverview High-level Git operations with dry-run support.
 *
 * Provides Git operations for pull, fetch, commit resolution, and status checks
 * with built-in dry-run mode and verbose logging.
 */

import { asGitSha } from "./sha-utils.js";
import { createGit, type GitOperationConfig } from "./core.js";
import {
  processRepositoryStatus,
  type PullStatus,
  type PullResult,
} from "./pull-status.js";
import type { GitSha } from "#types/git";

// Re-export types from pull-status module for convenience
export type { PullStatus, PullResult } from "./pull-status.js";

/**
 * Handles dry-run mode for pull operations by checking repository status.
 */
async function handleDryRunPull(
  config: GitOperationConfig,
): Promise<PullResult> {
  const callbacks = config.callbacks || {};

  const git = createGit(config);
  try {
    callbacks.onProgress?.("Fetching from origin...");
    await git.fetch(["--prune", "origin"]);

    callbacks.onProgress?.("Checking status...");
    const status = await git.status();

    return processRepositoryStatus(status, callbacks);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    callbacks.onWarning?.(`Could not check repository status: ${errorMessage}`);
    return {
      status: "up-to-date",
      changes: 0,
      insertions: 0,
      deletions: 0,
      files: [],
    };
  }
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
export async function pullWithRebase(
  config: GitOperationConfig = {},
): Promise<PullResult> {
  config.logger?.verbose(`pull --rebase in ${config.cwd ?? process.cwd()}`);

  if (config.dryRun === true) {
    return handleDryRunPull(config);
  }

  const callbacks = config.callbacks || {};
  const git = createGit(config);

  try {
    callbacks.onProgress?.("Executing git pull --rebase...");
    const result = await git.pull(["--rebase"]);

    const changes = result.summary.changes;
    const status: PullStatus = changes > 0 ? "rebase-applied" : "no-op";

    if (changes > 0) {
      callbacks.onSuccess?.(`Pull completed: ${changes} changes`);
    } else {
      callbacks.onSuccess?.("No changes to pull");
    }

    config.logger?.verbose(`Pull completed: ${changes} changes`);

    return {
      status,
      changes,
      insertions: result.summary.insertions,
      deletions: result.summary.deletions,
      files: result.files,
    };
  } catch (error) {
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
    callbacks.onProgress?.("Fetching from all remotes...");
    await git.fetch();
    callbacks.onSuccess?.("Fetch completed");
    config.logger?.verbose("Fetch completed");
  } catch (error) {
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
