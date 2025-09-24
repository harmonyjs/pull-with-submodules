/**
 * @fileoverview Repository pull and stash handling operations.
 *
 * Contains functions for pulling the main repository and handling
 * uncommitted changes with proper user feedback and error handling.
 *
 * Rationale: Always uses --rebase to maintain linear history; auto-stashing
 * enables workflow automation while preserving user work safety.
 */

import {
  pullWithRebase,
  type GitOperationConfig,
  type PullResult,
} from "#lib/git";
import { GitOperationError } from "#errors";
import { createLogger, type Logger } from "#ui";
import type { ExecutionContext } from "#types/core";

import {
  getWorkingTreeStatus,
  createStash,
  type StashResult,
} from "#orchestrator/stash";

/**
 * Handles uncommitted changes by creating a stash if necessary.
 *
 * @param gitConfig - Git operation configuration
 * @param context - Execution context for logging
 * @returns Promise resolving to stash result or null
 */
export async function handleUncommittedChanges(
  gitConfig: GitOperationConfig,
  context: ExecutionContext,
): Promise<StashResult | null> {
  const logger = createLogger(context);

  return await logger.withSpinner("Check working tree status", async () => {
    // In dry-run mode, simulate clean working tree
    if (gitConfig.dryRun === true) {
      logger.info("Working tree is clean (0 modified, 0 untracked)");
      return null;
    }

    // Real mode - perform actual operations
    try {
      const status = await getWorkingTreeStatus(gitConfig);

      if (status.clean) {
        logger.info("Working tree is clean (0 modified, 0 untracked)");
        return null;
      }

      logger.info(
        `Working tree has changes (${status.modifiedFiles} modified, ${status.untrackedFiles} untracked)`,
      );

      // Create stash for uncommitted changes
      logger.verbose("Creating stash for uncommitted changes");
      const stash = await createStash(
        "auto-stash before pull-with-submodules",
        gitConfig,
      );

      if (stash.created) {
        logger.info(`Stashed changes: ${stash.stashRef}`);
      } else {
        logger.info("No changes to stash");
      }

      return stash;
    } catch (error) {
      throw new GitOperationError("Failed to handle uncommitted changes", {
        cause: error as Error,
        suggestions: [
          "Check repository state",
          "Commit or stash changes manually",
        ],
      });
    }
  });
}

/**
 * Pulls the main repository with rebase and returns full result.
 *
 * @param gitConfig - Git operation configuration
 * @param context - Execution context for logging
 * @returns Promise resolving to pull result with status information
 */
export async function pullMainRepositoryWithResult(
  gitConfig: GitOperationConfig,
  context: ExecutionContext,
): Promise<PullResult> {
  const logger = createLogger(context);

  return await logger.withSpinner(
    "Pull main repository with rebase",
    async () => {
      // In dry-run mode, simulate typical repository state
      if (gitConfig.dryRun === true) {
        logger.info("Repository is ahead by 2 commits (push needed)");
        return {
          status: "ahead",
          changes: 0,
          insertions: 0,
          deletions: 0,
          files: [],
          ahead: 2,
          behind: 0,
        };
      }

      // Real mode - perform actual pull operation
      try {
        const result = await pullWithRebase({
          ...gitConfig,
          callbacks: logger.createCallbacks(),
        });
        handlePullResult(result, gitConfig, logger);
        return result;
      } catch (error) {
        return handlePullError(error);
      }
    },
  );
}

/**
 * Pulls the main repository with rebase.
 *
 * @param gitConfig - Git operation configuration
 * @param context - Execution context for logging
 * @returns Promise resolving to true if repository was updated
 */
export async function pullMainRepository(
  gitConfig: GitOperationConfig,
  context: ExecutionContext,
): Promise<boolean> {
  const result = await pullMainRepositoryWithResult(gitConfig, context);
  return result.changes > 0;
}

/**
 * Handles the result of a pull operation and logs appropriate messages.
 */
function handlePullResult(
  result: PullResult,
  gitConfig: GitOperationConfig,
  logger: Logger,
): boolean {
  if (result.status === "ahead") {
    logger.info(`Repository is ahead by ${result.ahead} commits (push needed)`);
    return false;
  } else if (result.changes > 0) {
    logPullChanges(result, gitConfig, logger);
    return true;
  } else {
    // Status message already handled by processRepositoryStatus callbacks
    // No need to duplicate messages here
    return false;
  }
}

/**
 * Logs the changes made during a pull operation.
 */
function logPullChanges(
  result: PullResult,
  gitConfig: GitOperationConfig,
  logger: Logger,
): void {
  if (gitConfig.dryRun === true) {
    logger.info(`Would pull ${result.changes} new commits from origin`);
  } else {
    logger.info(
      `Updated ${result.changes} files with ${result.insertions} insertions, ${result.deletions} deletions`,
    );
  }
}

/**
 * Handles errors during pull operations and wraps them with appropriate context.
 */
function handlePullError(error: unknown): never {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (errorMessage.includes("conflict")) {
    throw new GitOperationError("Rebase conflicts detected during pull", {
      cause: error as Error,
      suggestions: [
        "Resolve conflicts manually with 'git rebase --continue'",
        "Or abort rebase with 'git rebase --abort'",
        "Then run pull-with-submodules again",
      ],
    });
  }

  throw new GitOperationError("Failed to pull main repository", {
    cause: error as Error,
    suggestions: [
      "Check network connection",
      "Verify remote repository access",
    ],
  });
}
