/**
 * @fileoverview Stash management utilities.
 *
 * Provides functions for creating and restoring Git stashes with proper
 * dry-run support and error handling for uncommitted changes.
 */

import { createGit, type GitOperationConfig } from "#lib/git";
import { GitOperationError } from "#errors";

import {
  validateStashReference,
  handleStashRestoreError
} from "./helpers.js";

/**
 * Stash creation result.
 */
export interface StashResult {
  /** Stash reference (e.g., "stash@{0}") */
  readonly stashRef: string;
  /** Whether stash was actually created (false if no changes to stash) */
  readonly created: boolean;
  /** Human-readable description of what was stashed */
  readonly message: string;
}

/**
 * Working tree status information.
 */
export interface WorkingTreeStatus {
  /** True if working tree is clean (no uncommitted changes) */
  readonly clean: boolean;
  /** Number of modified files */
  readonly modifiedFiles: number;
  /** Number of untracked files */
  readonly untrackedFiles: number;
  /** List of modified file paths (for logging) */
  readonly modifiedPaths: readonly string[];
}

/**
 * Checks the working tree status for uncommitted changes.
 *
 * @param config - Git operation configuration
 * @returns Promise resolving to working tree status
 * @throws GitOperationError if status check fails
 */
export async function getWorkingTreeStatus(
  config: GitOperationConfig = {}
): Promise<WorkingTreeStatus> {
  const git = createGit(config);

  try {
    const status = await git.status();

    const modifiedFiles = status.modified.length + status.staged.length;
    const untrackedFiles = status.not_added.length;
    const modifiedPaths = [...status.modified, ...status.staged];

    config.logger?.debug(
      `Working tree status: ${modifiedFiles} modified, ${untrackedFiles} untracked`
    );

    return {
      clean: status.files.length === 0,
      modifiedFiles,
      untrackedFiles,
      modifiedPaths,
    };
  } catch (error) {
    throw new GitOperationError(
      "Failed to check working tree status",
      {
        cause: error as Error,
        suggestions: ["Ensure you're in a valid Git repository"],
      }
    );
  }
}

/**
 * Creates a stash with uncommitted changes.
 *
 * @param message - Stash message
 * @param config - Git operation configuration
 * @returns Promise resolving to stash result
 * @throws GitOperationError if stash creation fails
 */
export async function createStash(
  message: string,
  config: GitOperationConfig = {}
): Promise<StashResult> {
  if (message.trim() === "") {
    throw new GitOperationError(
      "Stash message cannot be empty",
      {
        cause: new Error("Invalid stash message"),
        suggestions: ["Provide a descriptive message for the stash"],
      }
    );
  }

  config.logger?.debug(`Creating stash with message: "${message}"`);

  if (config.dryRun === true) {
    config.logger?.info(`Would create stash: "${message}"`);
    return {
      stashRef: "stash@{0}",
      created: true,
      message,
    };
  }

  const git = createGit(config);

  try {
    // Check if there are changes to stash
    const status = await getWorkingTreeStatus(config);
    if (status.clean) {
      config.logger?.debug("No changes to stash");
      return {
        stashRef: "",
        created: false,
        message: "No changes to stash",
      };
    }

    // Create stash with message
    await git.stash(["push", "-m", message]);

    config.logger?.debug(`Stash created successfully: "${message}"`);

    return {
      stashRef: "stash@{0}",
      created: true,
      message,
    };
  } catch (error) {
    throw new GitOperationError(
      `Failed to create stash: ${message}`,
      {
        cause: error as Error,
        suggestions: ["Check for conflicts or invalid files", "Ensure working directory is accessible"],
      }
    );
  }
}

/**
 * Restores a stash by reference.
 *
 * @param stashRef - Stash reference (e.g., "stash@{0}")
 * @param config - Git operation configuration
 * @returns Promise that resolves when stash is restored
 * @throws GitOperationError if stash restore fails
 */
export async function restoreStash(
  stashRef: string,
  config: GitOperationConfig = {}
): Promise<void> {
  validateStashReference(stashRef);

  config.logger?.debug(`Restoring stash: ${stashRef}`);

  if (config.dryRun === true) {
    config.logger?.info(`Would restore stash: ${stashRef}`);
    return;
  }

  const git = createGit(config);

  try {
    await git.stash(["pop", stashRef]);
    config.logger?.debug(`Stash restored successfully: ${stashRef}`);
  } catch (error) {
    handleStashRestoreError(error, stashRef);
  }
}

