/**
 * @fileoverview Helper functions for workflow operations.
 *
 * Contains utility functions for gitlink commits, stash operations,
 * and error handling used by the main workflow coordinator.
 */

import { stageFiles, createCommit } from "#lib/git/operations";
import { GitOperationError } from "#errors";
import type { UpdateResult } from "#types/core";
import type { GitOperationConfig } from "#lib/git";
import { spinner } from "@clack/prompts";

import { restoreStash, type StashResult } from "#orchestrator/stash";
import { SHORT_SHA_LENGTH } from "#lib/git/sha-utils";

/**
 * Applies gitlink commits for updated submodules.
 *
 * @param submoduleResults - Results from submodule processing
 * @param gitConfig - Git operation configuration
 * @returns Promise resolving to number of commits created
 */
export async function applyGitlinkCommits(
  submoduleResults: readonly UpdateResult[],
  gitConfig: GitOperationConfig,
): Promise<number> {
  const updatedSubmodules = submoduleResults.filter(
    (result) => result.status === "updated" && result.selection !== null,
  );

  if (updatedSubmodules.length === 0) {
    gitConfig.logger?.debug("No submodule updates to commit");
    return 0;
  }

  let commitsCreated = 0;

  for (const result of updatedSubmodules) {
    if (!result.selection) continue;

    const s = spinner();
    s.start(`Committing gitlink for ${result.submodule.path}`);

    try {
      await stageFiles([result.submodule.path], gitConfig);

      const commitMessage = formatGitlinkCommitMessage(
        result.submodule.path,
        result.submodule.branch ?? "main",
        result.selection.sha,
      );

      await createCommit(commitMessage, gitConfig);
      commitsCreated++;

      s.stop(`Committed gitlink update for ${result.submodule.path}`);
      gitConfig.logger?.debug(`Created gitlink commit: ${commitMessage}`);
    } catch (error) {
      s.stop(`Failed to commit gitlink for ${result.submodule.path}`);

      // Log error but continue with other submodules
      gitConfig.logger?.error(
        `Failed to commit gitlink for ${result.submodule.path}: ${String(error)}`,
      );
    }
  }

  return commitsCreated;
}

/**
 * Safely restores a stash with error handling.
 *
 * @param stash - Stash to restore
 * @param gitConfig - Git operation configuration
 */
export async function restoreStashSafely(
  stash: StashResult,
  gitConfig: GitOperationConfig,
): Promise<void> {
  if (stash.created === false || stash.stashRef === undefined) {
    return;
  }

  // In dry-run mode, the stash creation was simulated, so restoration should also be simulated
  if (gitConfig.dryRun === true) {
    gitConfig.logger?.info(`Restore stash: ${stash.stashRef} (dry-run)`);
    return;
  }

  const s = spinner();
  s.start(`Restoring stash: ${stash.stashRef}`);

  try {
    await restoreStash(stash.stashRef, gitConfig);
    s.stop("Stash restored successfully");
  } catch (error) {
    s.stop("Failed to restore stash");

    // This is a serious issue - user's work might be stuck in stash
    gitConfig.logger?.error(
      `IMPORTANT: Failed to restore stash ${stash.stashRef}. ` +
        `Your uncommitted changes are safely stored in the stash. ` +
        `Use 'git stash list' to see stashes and 'git stash apply ${stash.stashRef}' to restore manually.`,
    );

    throw new GitOperationError(`Failed to restore stash: ${stash.stashRef}`, {
      cause: error as Error,
      suggestions: [
        `Use 'git stash apply ${stash.stashRef}' to restore manually`,
        "Check for conflicts with recent changes",
        "Use 'git stash list' to see all available stashes",
      ],
    });
  }
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
