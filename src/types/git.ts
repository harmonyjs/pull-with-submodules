/**
 * @fileoverview Git domain type definitions for pull-with-submodules.
 *
 * Defines Git-related types for commits, branches, submodules, and operations.
 */

/**
 * Branded commit SHA string to ensure type safety.
 */
export type GitSha = string & { readonly Brand: "GitSha" };

/**
 * Minimal representation of a Git commit.
 */
export interface GitCommit {
  /** Commit hash identifying the object. */
  readonly sha: GitSha;
}

/**
 * Git branch reference with optional remote and head SHA.
 */
export interface GitBranch {
  /** Branch name without remote prefix (e.g. `main`, `develop`). */
  readonly name: string;
  /** Optional remote name (e.g. `origin`) when representing remote refs. */
  readonly remote?: string;
  /** HEAD commit hash if already looked up; undefined when deferred. */
  readonly headSha?: GitSha;
}

/**
 * Submodule configuration from .gitmodules file.
 */
export interface SubmoduleConfig {
  /** Section name / logical identifier of the submodule. */
  readonly name: string;
  /** Relative path from repository root to the submodule working tree. */
  readonly path: string;
  /** Optional upstream URL as declared in `.gitmodules`. */
  readonly url?: string;
  /** Optional explicitly configured branch. */
  readonly branch?: string;
}

/**
 * Gitlink update metadata for commit message generation.
 */
export interface GitLinkUpdate {
  /** Submodule relative path (same semantics as `Submodule.path`). */
  readonly path: string;
  /** Previous recorded SHA (undefined if the submodule was newly added). */
  readonly from?: GitSha;
  /** New target SHA after update. */
  readonly to: GitSha;
  /** The branch context used to derive `to` (if applicable). */
  readonly branch?: string;
  /** Human-readable rationale (e.g. "local contains remote"). */
  readonly reason: string;
}

/**
 * Function to check if one commit is an ancestor of another.
 */
export type AncestorCheckFn = (
  ancestor: GitSha,
  descendant: GitSha,
) => boolean | Promise<boolean>;

/**
 * Working tree status.
 */
export interface WorkingTreeState {
  /** True when no staged or unstaged changes are present. */
  readonly clean: boolean;
}

/**
 * Summary of changes from a pull operation.
 */
export interface PullSummary {
  /** Total number of changed files. */
  readonly changes: number;
  /** Total number of insertions. */
  readonly insertions: number;
  /** Total number of deletions. */
  readonly deletions: number;
}

/**
 * Pull operation result with rebase.
 */
export interface PullOperationResult {
  /** Summary of the changes made. */
  readonly summary: PullSummary;
  /** List of files that were modified. */
  readonly files: readonly string[];
  /** Remote name that was pulled from (if any). */
  readonly remote: string | null;
}

/**
 * Git operations interface for dependency injection and testing.
 *
 * This interface abstracts Git operations to enable:
 * - Dependency injection in production
 * - Easy mocking for unit tests
 * - Consistent error handling across the application
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
