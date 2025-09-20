/**
 * @fileoverview Repository pull and stash handling operations.
 *
 * Contains functions for pulling the main repository and handling
 * uncommitted changes with proper user feedback and error handling.
 *
 * Rationale: Always uses --rebase to maintain linear history; auto-stashing
 * enables workflow automation while preserving user work safety.
 */

import { pullWithRebase, type GitOperationConfig } from "#lib/git";
import { GitOperationError } from "#errors";
import { spinner } from "@clack/prompts";

import {
  getWorkingTreeStatus,
  createStash,
  type StashResult,
} from "#orchestrator/stash";

/**
 * Handles uncommitted changes by creating a stash if necessary.
 *
 * @param gitConfig - Git operation configuration
 * @returns Promise resolving to stash result or null
 */
export async function handleUncommittedChanges(
  gitConfig: GitOperationConfig,
): Promise<StashResult | null> {
  const s = spinner();
  s.start("Checking working tree status");

  try {
    const status = await getWorkingTreeStatus(gitConfig);

    if (status.clean) {
      s.stop("Working tree is clean (0 modified, 0 untracked)");
      return null;
    }

    s.stop(`Working tree has changes (${status.modifiedFiles} modified, ${status.untrackedFiles} untracked)`);

    // In dry-run mode, just report what would happen
    if (gitConfig.dryRun === true) {
      gitConfig.logger?.info("Stash uncommitted changes (dry-run)");
      return {
        stashRef: "stash@{0}",
        created: true,
        message: "auto-stash before pull-with-submodules",
      };
    }

    // Create stash for uncommitted changes
    const stashSpinner = spinner();
    stashSpinner.start("Stashing uncommitted changes");

    const stash = await createStash(
      "auto-stash before pull-with-submodules",
      gitConfig,
    );

    if (stash.created) {
      stashSpinner.stop(`Stashed changes: ${stash.stashRef}`);
    } else {
      stashSpinner.stop("No changes to stash");
    }

    return stash;
  } catch (error) {
    s.stop("Failed to check working tree");
    throw new GitOperationError("Failed to handle uncommitted changes", {
      cause: error as Error,
      suggestions: [
        "Check repository state",
        "Commit or stash changes manually",
      ],
    });
  }
}

/**
 * Pulls the main repository with rebase.
 *
 * @param gitConfig - Git operation configuration
 * @returns Promise resolving to true if repository was updated
 */
export async function pullMainRepository(
  gitConfig: GitOperationConfig,
): Promise<boolean> {
  const s = spinner();
  s.start("Pulling main repository with rebase");

  try {
    const result = await pullWithRebase(gitConfig);

    if (result.changes > 0) {
      if (gitConfig.dryRun === true) {
        s.stop(`Would pull ${result.changes} new commits from origin`);
      } else {
        s.stop(
          `Updated ${result.changes} files with ${result.insertions} insertions, ${result.deletions} deletions`,
        );
      }
      return true;
    } else {
      if (gitConfig.dryRun === true) {
        s.stop("Repository is already up-to-date with origin");
      } else {
        s.stop("Repository is up to date");
      }
      return false;
    }
  } catch (error) {
    s.stop("Pull failed");

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
}
