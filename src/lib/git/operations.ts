/**
 * @fileoverview High-level Git operations with dry-run support.
 *
 * Provides Git operations for pull, fetch, commit resolution, and status checks
 * with built-in dry-run mode and verbose logging.
 */

import { asGitSha } from "./sha-utils.js";
import { createGit, type GitOperationConfig } from "./core.js";
import type { GitSha } from "#types/git.js";

/**
 * Result of a pull operation.
 */
export interface PullResult {
  /** Number of files changed */
  readonly changes: number;
  /** Number of insertions */
  readonly insertions: number;
  /** Number of deletions */
  readonly deletions: number;
  /** List of changed files */
  readonly files: readonly string[];
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
  config.logger?.debug(`pull --rebase in ${config.cwd ?? process.cwd()}`);

  if (config.dryRun === true) {
    config.logger?.info("Would pull with rebase");
    return {
      changes: 0,
      insertions: 0,
      deletions: 0,
      files: [],
    };
  }

  const git = createGit(config);

  try {
    const result = await git.pull(["--rebase"]);

    config.logger?.debug(`Pull completed: ${result.summary.changes} changes`);

    return {
      changes: result.summary.changes,
      insertions: result.summary.insertions,
      deletions: result.summary.deletions,
      files: result.files,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("conflict")) {
      throw new Error(`Rebase conflicts detected: ${errorMessage}`);
    }

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
  config.logger?.debug(`fetch in ${config.cwd ?? process.cwd()}`);

  if (config.dryRun === true) {
    config.logger?.info("Would fetch remotes");
    return;
  }

  const git = createGit(config);

  try {
    await git.fetch();
    config.logger?.debug("Fetch completed");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
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
 * @param config - Git operation configuration
 * @returns Promise resolving to true if working tree is clean
 *
 * @example
 * ```typescript
 * const clean = await getWorkingTreeStatus({ cwd: '/path/to/repo' });
 * ```
 */
export async function getWorkingTreeStatus(
  config: GitOperationConfig = {},
): Promise<{ clean: boolean }> {
  const git = createGit(config);

  try {
    const status = await git.status();
    const clean = status.files.length === 0;
    config.logger?.debug(`Working tree is ${clean ? "clean" : "dirty"}`);
    return { clean };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Status check failed: ${errorMessage}`);
  }
}