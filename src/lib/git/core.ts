/**
 * @fileoverview Low-level Git operations for repository inspection and ancestry checks.
 *
 * Provides utilities for commit ancestry verification, SHA resolution,
 * and branch information using raw git commands through simple-git.
 */

import { simpleGit, type SimpleGit } from "simple-git";
import type { Logger } from "#ui/logger";

/**
 * Result of a git ancestry check operation.
 */
export interface AncestryCheckResult {
  /** Whether the ancestor relationship exists */
  readonly isAncestor: boolean;
  /** Additional context or error information */
  readonly details?: string;
}

/**
 * Configuration for git operations.
 */
export interface GitOperationConfig {
  /** Working directory for git operations */
  readonly cwd?: string;
  /** Timeout in milliseconds for git operations */
  readonly timeout?: number;
  /** Enable dry-run mode (log operations without executing) */
  readonly dryRun?: boolean;
  /** Enable verbose logging */
  readonly verbose?: boolean;
  /** Optional logger instance for operation logging */
  readonly logger?: Logger;
}

const DEFAULT_GIT_TIMEOUT = 30_000;

/**
 * Default configuration for git operations.
 */
const DEFAULT_GIT_CONFIG: GitOperationConfig = {
  timeout: DEFAULT_GIT_TIMEOUT,
};

/**
 * Creates a configured SimpleGit instance for the specified directory.
 *
 * @param config - Configuration options for git operations
 * @returns Configured SimpleGit instance bound to the specified directory
 *
 * @example
 * ```typescript
 * const git = createGit({ cwd: '/path/to/repo' });
 * const status = await git.status();
 * ```
 */
export function createGit(config: GitOperationConfig = {}): SimpleGit {
  const { cwd, timeout } = { ...DEFAULT_GIT_CONFIG, ...config };

  return simpleGit({
    baseDir: cwd ?? process.cwd(),
    timeout: {
      block: timeout ?? DEFAULT_GIT_CONFIG.timeout ?? DEFAULT_GIT_TIMEOUT,
    },
    config: [
      // Ensure consistent output format
      "core.quotepath=false",
      "core.autocrlf=false",
    ],
  });
}

/**
 * Checks if one commit is an ancestor of another.
 *
 * @param ancestor - The potential ancestor commit SHA
 * @param descendant - The potential descendant commit SHA
 * @param config - Git operation configuration
 * @returns Promise resolving to ancestry check result
 *
 * @example
 * ```typescript
 * const result = await isAncestor('abc123', 'def456');
 * if (result.isAncestor) {
 *   console.log('abc123 is an ancestor of def456');
 * }
 * ```
 */
export async function isAncestor(
  ancestor: string,
  descendant: string,
  config: GitOperationConfig = {},
): Promise<AncestryCheckResult> {
  const git = createGit(config);

  try {
    await git.raw("merge-base", "--is-ancestor", ancestor, descendant);

    return {
      isAncestor: true,
      details: `${ancestor} is an ancestor of ${descendant}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("exit code 1")) {
      return {
        isAncestor: false,
        details: `${ancestor} is not an ancestor of ${descendant}`,
      };
    }

    return {
      isAncestor: false,
      details: `Ancestry check failed: ${errorMessage}`,
    };
  }
}

/**
 * Gets the current branch name of the repository.
 *
 * @param config - Git operation configuration
 * @returns Promise resolving to the current branch name
 * @throws Error if not on a branch (detached HEAD) or other git error
 *
 * @example
 * ```typescript
 * const branch = await getBranchName();
 * console.log(`Currently on branch: ${branch}`);
 * ```
 */
export async function getBranchName(
  config: GitOperationConfig = {},
): Promise<string> {
  const git = createGit(config);

  try {
    const result = await git.raw("rev-parse", "--abbrev-ref", "HEAD");
    const branch = result.trim();

    if (branch === "HEAD") {
      throw new Error("Repository is in detached HEAD state");
    }

    return branch;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get current branch name: ${errorMessage}`);
  }
}

/**
 * Checks if the working directory is clean (no uncommitted changes).
 *
 * @param config - Git operation configuration
 * @returns Promise resolving to true if working directory is clean
 *
 * @example
 * ```typescript
 * const clean = await isWorkingDirectoryClean();
 * if (!clean) {
 *   console.log('Please commit or stash your changes first');
 * }
 * ```
 */
export async function isWorkingDirectoryClean(
  config: GitOperationConfig = {},
): Promise<boolean> {
  const git = createGit(config);

  try {
    const status = await git.status();

    return (
      status.files.length === 0 &&
      status.staged.length === 0 &&
      status.created.length === 0 &&
      status.deleted.length === 0 &&
      status.modified.length === 0 &&
      status.renamed.length === 0
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to check working directory status: ${errorMessage}`,
    );
  }
}

/**
 * Gets the merge base (common ancestor) of two commits.
 *
 * @param commit1 - First commit SHA or reference
 * @param commit2 - Second commit SHA or reference
 * @param config - Git operation configuration
 * @returns Promise resolving to the merge base commit SHA
 * @throws Error if no common ancestor exists
 *
 * @example
 * ```typescript
 * const base = await getMergeBase('main', 'feature-branch');
 * console.log(`Common ancestor: ${base}`);
 * ```
 */
export async function getMergeBase(
  commit1: string,
  commit2: string,
  config: GitOperationConfig = {},
): Promise<string> {
  const git = createGit(config);

  try {
    const result = await git.raw("merge-base", commit1, commit2);
    const mergeBase = result.trim();

    if (!/^[a-f0-9]{40}$/i.test(mergeBase)) {
      throw new Error(`Invalid merge base SHA format: ${mergeBase}`);
    }

    return mergeBase;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to find merge base of '${commit1}' and '${commit2}': ${errorMessage}`,
    );
  }
}

