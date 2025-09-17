/**
 * @fileoverview Git operations module for pull-with-submodules.
 */

import { simpleGit, type SimpleGit } from "simple-git";
import { GitOperationError } from "../errors/index.js";
import type { ExecutionContext } from "../types/core.js";
import type {
  GitSha,
  GitBranch,
  WorkingTreeState,
  PullOperationResult,
} from "../types/git.js";
import { asGitSha } from "../lib/git/sha-utils.js";
import { createLogger, type Logger } from "../ui/logger.js";

/**
 * Git operations interface for dependency injection and testing.
 */
export interface GitOperations {
  /**
   * Pull with rebase from the currently tracked remote branch.
   *
   * @param repoPath - Absolute path to the repository
   * @returns Pull result with detailed status
   * @throws {GitOperationError} When pull fails or conflicts occur
   */
  pullWithRebase(repoPath: string): Promise<PullOperationResult>;

  /**
   * Fetch all remotes without merging.
   *
   * @param repoPath - Absolute path to the repository
   * @returns Promise that resolves when fetch completes
   * @throws {GitOperationError} When fetch fails
   */
  fetch(repoPath: string): Promise<void>;

  /**
   * Get the current working tree status.
   *
   * @param repoPath - Absolute path to the repository
   * @returns Working tree state indicating if clean
   * @throws {GitOperationError} When status check fails
   */
  getStatus(repoPath: string): Promise<WorkingTreeState>;

  /**
   * Get the current branch name.
   *
   * @param repoPath - Absolute path to the repository
   * @returns Current branch information
   * @throws {GitOperationError} When branch cannot be determined
   */
  getCurrentBranch(repoPath: string): Promise<GitBranch>;

  /**
   * Get commit SHA for a given reference.
   *
   * @param repoPath - Absolute path to the repository
   * @param ref - Git reference (branch, tag, SHA)
   * @returns Commit SHA
   * @throws {GitOperationError} When reference cannot be resolved
   */
  getCommitSha(repoPath: string, ref: string): Promise<GitSha>;
}

/**
 * Production implementation of GitOperations using simple-git.
 */
class SimpleGitOperations implements GitOperations {
  private readonly logger: Logger;

  constructor(
    private readonly context: ExecutionContext,
    public readonly gitFactory: (baseDir: string) => SimpleGit = simpleGit,
  ) {
    this.logger = createLogger(context);
  }

  async pullWithRebase(repoPath: string): Promise<PullOperationResult> {
    SimpleGitOperations.validateRepoPath(repoPath);

    this.logger.debug(`Pulling with rebase in ${repoPath}`);

    if (this.context.dryRun) {
      this.logger.info("Would pull with rebase");
      return {
        summary: { changes: 0, insertions: 0, deletions: 0 },
        files: [],
        remote: null,
      };
    }

    const git = this.gitFactory(repoPath);

    try {
      const result = await git.pull(["--rebase"]);

      this.logger.debug(`Pull completed: ${result.summary.changes} changes`);

      return {
        summary: {
          changes: result.summary.changes,
          insertions: result.summary.insertions,
          deletions: result.summary.deletions,
        },
        files: result.files,
        remote: (result as { remote?: string | null }).remote ?? null,
      };
    } catch (error) {
      // Check for rebase conflicts
      if (error instanceof Error && error.message.includes("conflict")) {
        throw new GitOperationError("Rebase conflicts detected", {
          cause: error,
          suggestions: [
            "Resolve conflicts manually",
            "Run 'git rebase --continue' after resolving",
            "Or run 'git rebase --abort' to cancel",
          ],
          details: { repoPath },
        });
      }

      throw new GitOperationError("Pull with rebase failed", {
        cause: error,
        suggestions: [
          "Check network connectivity",
          "Verify remote repository access",
          "Ensure working tree is clean",
        ],
        details: { repoPath },
      });
    }
  }

  async fetch(repoPath: string): Promise<void> {
    SimpleGitOperations.validateRepoPath(repoPath);

    this.logger.debug(`Fetching remotes in ${repoPath}`);

    if (this.context.dryRun) {
      this.logger.info("Would fetch remotes");
      return;
    }

    const git = this.gitFactory(repoPath);

    try {
      await git.fetch();

      this.logger.debug("Fetch completed");
    } catch (error) {
      throw new GitOperationError("Fetch failed", {
        cause: error,
        suggestions: [
          "Check network connectivity",
          "Verify remote repository access",
          "Check authentication credentials",
        ],
        details: { repoPath },
      });
    }
  }

  async getStatus(repoPath: string): Promise<WorkingTreeState> {
    SimpleGitOperations.validateRepoPath(repoPath);

    const git = this.gitFactory(repoPath);

    try {
      const status = await git.status();
      const clean = status.files.length === 0;

      this.logger.debug(
        `Status check: ${clean ? "clean" : "dirty"} working tree`,
      );

      return { clean };
    } catch (error) {
      throw new GitOperationError("Status check failed", {
        cause: error,
        suggestions: ["Verify repository is valid", "Check file permissions"],
        details: { repoPath },
      });
    }
  }

  async getCurrentBranch(repoPath: string): Promise<GitBranch> {
    SimpleGitOperations.validateRepoPath(repoPath);

    const git = this.gitFactory(repoPath);

    try {
      const status = await git.status();
      const branchName = status.current;

      if (
        branchName === null ||
        branchName === undefined ||
        branchName === ""
      ) {
        throw new GitOperationError("Cannot determine current branch", {
          suggestions: [
            "Check if repository is in detached HEAD state",
            "Ensure repository is properly initialized",
          ],
          details: { repoPath },
        });
      }

      this.logger.debug(`Current branch: ${branchName}`);

      return {
        name: branchName,
      };
    } catch (error) {
      if (error instanceof GitOperationError) {
        throw error;
      }

      throw new GitOperationError("Failed to get current branch", {
        cause: error,
        suggestions: ["Verify repository is valid", "Check file permissions"],
        details: { repoPath },
      });
    }
  }

  async getCommitSha(repoPath: string, ref: string): Promise<GitSha> {
    SimpleGitOperations.validateRepoPath(repoPath);
    if (ref?.trim() === "") {
      throw new GitOperationError("Git reference cannot be empty", {});
    }

    const git = this.gitFactory(repoPath);

    try {
      const sha = await git.revparse([ref]);

      this.logger.debug(`Resolved ${ref} to ${sha}`);

      return asGitSha(sha);
    } catch (error) {
      throw new GitOperationError(`Failed to resolve reference: ${ref}`, {
        cause: error,
        suggestions: [
          "Verify reference exists",
          "Check if remote refs are up to date",
          "Try fetching remotes first",
        ],
        details: { repoPath, ref },
      });
    }
  }

  /**
   * Validates repository path parameter.
   *
   * @param repoPath - Repository path to validate
   * @throws {GitOperationError} When path is invalid
   */
  private static validateRepoPath(repoPath: string): void {
    if (repoPath?.trim() === "") {
      throw new GitOperationError("Repository path cannot be empty", {});
    }
  }
}

/**
 * Factory function to create git operations instance.
 *
 * @param context - Execution context with flags and settings
 * @param gitFactory - Optional factory for SimpleGit instances (for testing)
 * @returns Git operations interface
 */
export function createGit(
  context: ExecutionContext,
  gitFactory?: (baseDir: string) => SimpleGit,
): GitOperations {
  return new SimpleGitOperations(context, gitFactory);
}
