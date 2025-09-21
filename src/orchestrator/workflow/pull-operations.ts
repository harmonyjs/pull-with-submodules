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
import { spinner, log } from "@clack/prompts";
import { isInteractiveEnvironment } from "#ui/tty";
import { symbols } from "#ui/colors";

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
  if (!isInteractiveEnvironment()) {
    // Non-interactive environment: use simple logging
    log.info(`${symbols.process} Checking working tree status...`);
    try {
      const status = await getWorkingTreeStatus(gitConfig);

      if (status.clean) {
        log.info(`${symbols.success} Working tree is clean (0 modified, 0 untracked)`);
        return null;
      }

      log.info(`${symbols.step} Working tree has changes (${status.modifiedFiles} modified, ${status.untrackedFiles} untracked)`);

      if (gitConfig.dryRun === true) {
        log.info(`${symbols.dryRun} Would stash uncommitted changes`);
        return {
          stashRef: "stash@{0}",
          created: true,
          message: "auto-stash before pull-with-submodules",
        };
      }

      log.info(`${symbols.process} Stashing uncommitted changes...`);
      const stash = await createStash("auto-stash before pull-with-submodules", gitConfig);

      if (stash.created) {
        log.info(`${symbols.success} Stashed changes: ${stash.stashRef}`);
      } else {
        log.info(`${symbols.step} No changes to stash`);
      }

      return stash;
    } catch (error) {
      log.error(`${symbols.error} Failed to handle uncommitted changes`);
      throw new GitOperationError("Failed to handle uncommitted changes", {
        cause: error as Error,
        suggestions: ["Check repository state", "Commit or stash changes manually"],
      });
    }
  }

  // Interactive environment: use spinners
  const s = spinner();
  try {
    s.start("Check working tree status");

    const status = await getWorkingTreeStatus(gitConfig);

    if (status.clean) {
      s.stop("Working tree is clean (0 modified, 0 untracked)");
      return null;
    }

    s.stop(`Working tree has changes (${status.modifiedFiles} modified, ${status.untrackedFiles} untracked)`);

    // In dry-run mode, just report what would happen
    if (gitConfig.dryRun === true) {
      gitConfig.logger?.info("Would stash uncommitted changes (dry-run)");
      return {
        stashRef: "stash@{0}",
        created: true,
        message: "auto-stash before pull-with-submodules",
      };
    }

    // Create stash for uncommitted changes
    const stashSpinner = spinner();
    try {
      stashSpinner.start("Stash uncommitted changes");

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
    } finally {
      try {
        stashSpinner.stop();
      } catch {
        // Ignore errors when stopping spinner
      }
    }
  } catch (error) {
    s.stop("Failed to check working tree");
    throw new GitOperationError("Failed to handle uncommitted changes", {
      cause: error as Error,
      suggestions: [
        "Check repository state",
        "Commit or stash changes manually",
      ],
    });
  } finally {
    try {
      s.stop();
    } catch {
      // Ignore errors when stopping spinner
    }
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
  if (!isInteractiveEnvironment()) {
    // Non-interactive environment: use simple logging
    log.info(`${symbols.process} Pull main repository with rebase...`);
    try {
      const result = await pullWithRebase(gitConfig);

      if (result.status === "ahead") {
        log.info(`${symbols.ahead} Repository is ahead by ${result.ahead} commits (push needed)`);
        return false;
      } else if (result.changes > 0) {
        if (gitConfig.dryRun === true) {
          log.info(`${symbols.dryRun} Would pull ${result.changes} new commits from origin`);
        } else {
          log.info(
            `${symbols.success} Updated ${result.changes} files with ${result.insertions} insertions, ${result.deletions} deletions`,
          );
        }
        return true;
      } else {
        log.info(`${symbols.success} Repository is up-to-date with origin`);
        return false;
      }
    } catch (error) {
      log.error(`${symbols.error} Pull failed`);

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

  // Interactive environment: use spinner
  const s = spinner();
  try {
    s.start("Pull main repository with rebase");

    const result = await pullWithRebase(gitConfig);

    if (result.status === "ahead") {
      s.stop(`Repository is ahead by ${result.ahead} commits (push needed)`);
      return false;
    } else if (result.changes > 0) {
      if (gitConfig.dryRun === true) {
        s.stop(`Would pull ${result.changes} new commits from origin`);
      } else {
        s.stop(
          `Updated ${result.changes} files with ${result.insertions} insertions, ${result.deletions} deletions`,
        );
      }
      return true;
    } else {
      s.stop("Repository is up-to-date with origin");
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
  } finally {
    try {
      s.stop();
    } catch {
      // Ignore errors when stopping spinner
    }
  }
}
