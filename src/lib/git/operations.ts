/**
 * @fileoverview High-level Git operations with dry-run support.
 *
 * Provides Git operations for pull, fetch, commit resolution, and status checks
 * with built-in dry-run mode and verbose logging.
 */

import { asGitSha } from "./sha-utils.js";
import { createGit, type GitOperationConfig } from "./core.js";
import type { GitSha } from "#types/git";
import { createTaskLog, type TaskLog } from "#ui/task-log";
import { getRepositoryStatusSymbol } from "#ui/colors";

/**
 * Detailed pull operation status.
 */
export type PullStatus =
  | "fast-forward"
  | "no-op"
  | "rebase-applied"
  | "would-rebase"
  | "conflict"
  | "diverged"
  | "ahead"
  | "up-to-date";

/**
 * Result of a pull operation.
 */
export interface PullResult {
  /** Detailed status of the pull operation */
  readonly status: PullStatus;
  /** Number of files changed */
  readonly changes: number;
  /** Number of insertions */
  readonly insertions: number;
  /** Number of deletions */
  readonly deletions: number;
  /** List of changed files */
  readonly files: readonly string[];
  /** Number of commits ahead of remote */
  readonly ahead?: number;
  /** Number of commits behind remote */
  readonly behind?: number;
}

/**
 * Processes repository status and returns appropriate pull result.
 */
function processRepositoryStatus(status: { ahead: number; behind: number }, taskLog: TaskLog): PullResult {
  const symbol = getRepositoryStatusSymbol(status);

  if (status.behind > 0 && status.ahead > 0) {
    taskLog.success(`${symbol} Repository has diverged: ${status.ahead} local, ${status.behind} remote commits`);
    return {
      status: "diverged",
      changes: status.behind,
      insertions: 0,
      deletions: 0,
      files: [],
      ahead: status.ahead,
      behind: status.behind,
    };
  } else if (status.behind > 0) {
    taskLog.success(`${symbol} Would pull ${status.behind} new commits from origin`);
    return {
      status: "would-rebase",
      changes: status.behind,
      insertions: 0,
      deletions: 0,
      files: [],
      behind: status.behind,
    };
  } else if (status.ahead > 0) {
    taskLog.success(`${symbol} Repository is ahead by ${status.ahead} commits`);
    return {
      status: "ahead",
      changes: 0,
      insertions: 0,
      deletions: 0,
      files: [],
      ahead: status.ahead,
    };
  } else {
    taskLog.success(`${symbol} Repository is up-to-date with origin`);
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
 * Handles dry-run mode for pull operations by checking repository status.
 */
async function handleDryRunPull(config: GitOperationConfig): Promise<PullResult> {
  const taskLog = createTaskLog({
    title: "Checking repository status (dry-run)",
    verbose: config.verbose ?? false
  });

  const git = createGit(config);
  try {
    taskLog.message("Fetching from origin...");
    await git.fetch(["--prune", "origin"]);

    taskLog.message("Checking status...");
    const status = await git.status();

    return processRepositoryStatus(status, taskLog);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    taskLog.warning(`Could not check repository status: ${errorMessage}`);
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

  const taskLog = createTaskLog({
    title: "Pulling main repository with rebase",
    verbose: config.verbose ?? false
  });

  const git = createGit(config);

  try {
    taskLog.message("Executing git pull --rebase...");
    const result = await git.pull(["--rebase"]);

    const changes = result.summary.changes;
    const status: PullStatus = changes > 0 ? "rebase-applied" : "no-op";

    if (changes > 0) {
      taskLog.success(`Pull completed: ${changes} changes`);
    } else {
      taskLog.success("No changes to pull");
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
      taskLog.error("Rebase conflicts detected");
      throw new Error(`Rebase conflicts detected: ${errorMessage}`);
    }

    taskLog.error(`Pull failed: ${errorMessage}`);
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
    config.logger?.info("Fetch remotes (dry-run)");
    return;
  }

  const taskLog = createTaskLog({
    title: "Fetching from remotes",
    verbose: config.verbose ?? false
  });

  const git = createGit(config);

  try {
    taskLog.message("Fetching from all remotes...");
    await git.fetch();
    taskLog.success("Fetch completed");
    config.logger?.verbose("Fetch completed");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    taskLog.error(`Fetch failed: ${errorMessage}`);
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


