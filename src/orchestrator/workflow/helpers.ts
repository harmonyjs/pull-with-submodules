/**
 * @fileoverview Helper functions for workflow operations.
 *
 * Contains utility functions for gitlink commits, stash operations,
 * and error handling used by the main workflow coordinator.
 */

import { stageFiles, createCommit } from "#lib/git/git-utils";
import { GitOperationError } from "#errors";
import type { UpdateResult, ExecutionContext } from "#types/core";
import type { GitOperationConfig } from "#lib/git";
import { createLogger, type Logger, type Task } from "#ui";

import { restoreStash, type StashResult } from "#orchestrator/stash";
import { SHORT_SHA_LENGTH } from "#lib/git/sha-utils";

/**
 * Creates a single gitlink commit for a submodule.
 */
async function createSingleGitlinkCommit(
  result: UpdateResult & { selection: NonNullable<UpdateResult["selection"]> },
  gitConfig: GitOperationConfig,
  logger: Logger,
): Promise<number> {
  try {
    await stageFiles([result.submodule.path], gitConfig);

    const commitMessage = formatGitlinkCommitMessage(
      result.submodule.path,
      result.submodule.branch ?? "main",
      result.selection.sha,
    );

    await createCommit(commitMessage, gitConfig);
    logger.debug(`Created gitlink commit: ${commitMessage}`);
    return 1;
  } catch (error) {
    logger.error(
      `Failed to commit gitlink for ${result.submodule.path}: ${String(error)}`,
    );
    return 0;
  }
}

/**
 * Creates a task for gitlink commit.
 */
function createGitlinkTask(
  result: UpdateResult & { selection: NonNullable<UpdateResult["selection"]> },
  config: {
    gitConfig: GitOperationConfig;
    logger: Logger;
    commitsCounter: { count: number };
  },
): Task {
  return {
    title: `Commit gitlink for ${result.submodule.path}`,
    task: async (): Promise<string> => {
      try {
        await stageFiles([result.submodule.path], config.gitConfig);

        const commitMessage = formatGitlinkCommitMessage(
          result.submodule.path,
          result.submodule.branch ?? "main",
          result.selection.sha,
        );

        await createCommit(commitMessage, config.gitConfig);
        config.commitsCounter.count++;
        config.logger.debug(`Created gitlink commit: ${commitMessage}`);
        return "Committed";
      } catch (error) {
        config.logger.error(
          `Failed to commit gitlink for ${result.submodule.path}: ${String(error)}`,
        );
        return "Failed";
      }
    },
  };
}

/**
 * Applies gitlink commits for updated submodules.
 *
 * @param submoduleResults - Results from submodule processing
 * @param gitConfig - Git operation configuration
 * @param context - Execution context for logging
 * @returns Promise resolving to number of commits created
 */
export async function applyGitlinkCommits(
  submoduleResults: readonly UpdateResult[],
  gitConfig: GitOperationConfig,
  context: ExecutionContext,
): Promise<number> {
  const logger = createLogger(context);
  const updatedSubmodules = submoduleResults.filter(
    (result) => result.status === "updated" && result.selection !== null,
  );

  if (updatedSubmodules.length === 0) {
    gitConfig.logger?.debug("No submodule updates to commit");
    return 0;
  }

  if (updatedSubmodules.length === 1) {
    // Single submodule - use withSpinner
    const result = updatedSubmodules[0];
    if (!result || !result.selection) return 0;

    const typedResult = result as UpdateResult & {
      selection: NonNullable<UpdateResult["selection"]>;
    };

    return await logger.withSpinner(
      `Commit gitlink for ${result.submodule.path}`,
      async () => createSingleGitlinkCommit(typedResult, gitConfig, logger),
    );
  }

  // Multiple submodules - use withTasks
  const commitsCounter = { count: 0 };
  const validResults = updatedSubmodules.filter(
    (
      result,
    ): result is UpdateResult & {
      selection: NonNullable<UpdateResult["selection"]>;
    } => result.selection !== null,
  );

  const tasks = validResults.map((result) =>
    createGitlinkTask(result, {
      gitConfig,
      logger,
      commitsCounter,
    }),
  );

  await logger.withTasks(tasks);

  return commitsCounter.count;
}

/**
 * Safely restores a stash with error handling.
 *
 * @param stash - Stash to restore
 * @param gitConfig - Git operation configuration
 * @param context - Execution context for logging
 */
export async function restoreStashSafely(
  stash: StashResult,
  gitConfig: GitOperationConfig,
  context: ExecutionContext,
): Promise<void> {
  const logger = createLogger(context);
  if (stash.created === false || stash.stashRef === undefined) {
    return;
  }

  // In dry-run mode, the stash creation was simulated, so restoration should also be simulated
  if (gitConfig.dryRun === true) {
    logger.info(`Restore stash: ${stash.stashRef} (dry-run)`);
    return;
  }

  await logger.withSpinner(`Restore stash: ${stash.stashRef}`, async () => {
    try {
      await restoreStash(stash.stashRef, gitConfig);
      logger.info("Stash restored successfully");
    } catch (error) {
      // This is a serious issue - user's work might be stuck in stash
      logger.error(
        `IMPORTANT: Failed to restore stash ${stash.stashRef}. ` +
          `Your uncommitted changes are safely stored in the stash. ` +
          `Use 'git stash list' to see stashes and 'git stash apply ${stash.stashRef}' to restore manually.`,
      );

      throw new GitOperationError(
        `Failed to restore stash: ${stash.stashRef}`,
        {
          cause: error as Error,
          suggestions: [
            `Use 'git stash apply ${stash.stashRef}' to restore manually`,
            "Check for conflicts with recent changes",
            "Use 'git stash list' to see all available stashes",
          ],
        },
      );
    }
  });
}

/**
 * Formats a gitlink commit message.
 *
 * @param submodulePath - Path to the submodule
 * @param branch - Branch being tracked
 * @param sha - Commit SHA
 * @returns Formatted commit message
 */
export function formatGitlinkCommitMessage(
  submodulePath: string,
  branch: string,
  sha: string,
): string {
  const shortSha = sha.slice(0, SHORT_SHA_LENGTH);
  return `chore(submodule): bump ${submodulePath} to ${branch} @ ${shortSha}`;
}
