/**
 * @fileoverview Gitlink operations for submodule pointer management.
 *
 * Provides functions for staging submodule changes and creating gitlink commits
 * with proper dry-run support and consistent message formatting.
 */

import { stageFiles, createCommit } from "#lib/git/operations.js";
import { createGit, type GitOperationConfig } from "#lib/git/core.js";
import { SHORT_SHA_LENGTH } from "#lib/git/sha-utils.js";
import type { Submodule } from "#types/core.js";
import type { GitSha } from "#types/git.js";

/**
 * Result of a gitlink operation.
 */
export interface GitlinkResult {
  /** Whether the operation was performed (false in dry-run or no-commit modes) */
  readonly executed: boolean;
  /** The commit SHA if a commit was created */
  readonly commitSha?: GitSha;
  /** The formatted commit message that was used */
  readonly message: string;
}

/**
 * Configuration for gitlink operations.
 */
export interface GitlinkConfig extends GitOperationConfig {
  /** Skip creating the commit (useful for staging only) */
  readonly noCommit?: boolean;
}

/**
 * Parameters for creating a gitlink commit.
 */
export interface GitlinkCommitParams {
  /** Submodule descriptor */
  readonly submodule: Submodule;
  /** Target commit SHA the submodule should point to */
  readonly targetSha: string;
  /** Branch name being updated */
  readonly branch: string;
}


/**
 * Format a gitlink commit message.
 *
 * Creates a consistent commit message format for submodule updates following
 * the pattern: "chore(submodule): bump <path> to <branch> @ <sha>"
 *
 * @param submodulePath - Relative path to the submodule
 * @param branch - Target branch name
 * @param sha - Target commit SHA (will be abbreviated to 8 characters)
 * @returns Formatted commit message
 *
 * @example
 * ```typescript
 * const message = formatGitlinkMessage('libs/shared', 'main', 'abc123def456');
 * // Returns: "chore(submodule): bump libs/shared to main @ abc123de"
 * ```
 */
export function formatGitlinkMessage(
  submodulePath: string,
  branch: string,
  sha: string,
): string {
  const shortSha = sha.slice(0, SHORT_SHA_LENGTH);
  return `chore(submodule): bump ${submodulePath} to ${branch} @ ${shortSha}`;
}

/**
 * Stage a submodule's gitlink changes.
 *
 * Adds the submodule path to the staging area, preparing it for commit.
 * This operation respects dry-run mode.
 *
 * @param submodulePath - Relative path to the submodule
 * @param config - Git operation configuration
 * @returns Promise that resolves when staging completes
 * @throws Error if staging fails
 *
 * @example
 * ```typescript
 * await stageSubmodule('libs/shared', { cwd: '/path/to/repo' });
 * ```
 */
export async function stageSubmodule(
  submodulePath: string,
  config: GitlinkConfig = {},
): Promise<void> {
  config.logger?.debug(`Staging submodule: ${submodulePath}`);

  try {
    await stageFiles([submodulePath], config);
    config.logger?.debug(`Successfully staged submodule: ${submodulePath}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to stage submodule ${submodulePath}: ${errorMessage}`);
  }
}

/**
 * Check if a submodule has gitlink changes that need to be committed.
 *
 * This is a placeholder for future implementation that would check if the
 * submodule's pointer has changed from what's currently committed.
 *
 * @param submodulePath - Relative path to the submodule
 * @param config - Git operation configuration
 * @returns True if there are changes to commit
 *
 * @example
 * ```typescript
 * const hasChanges = await checkGitlinkChanges('libs/shared', { cwd: '/repo' });
 * ```
 */
export async function checkGitlinkChanges(
  submodulePath: string,
  config: GitlinkConfig = {},
): Promise<boolean> {
  config.logger?.debug(`Checking gitlink changes for: ${submodulePath}`);

  try {
    const git = createGit(config.cwd !== undefined ? { cwd: config.cwd } : {});

    // Get the current working tree SHA for the submodule
    const workingTreeResult = await git.raw(['ls-tree', 'HEAD', submodulePath]);
    const workingSha = extractShaFromLsTree(workingTreeResult);

    // Get the staged/index SHA for the submodule
    const stagedResult = await git.raw(['ls-tree', '--cached', submodulePath]);
    const stagedSha = extractShaFromLsTree(stagedResult);

    const hasChanges = workingSha !== stagedSha;

    config.logger?.debug(
      `Gitlink changes for ${submodulePath}: ${hasChanges ? 'detected' : 'none'} ` +
      `(working: ${workingSha?.slice(0, SHORT_SHA_LENGTH) ?? 'none'}, ` +
      `staged: ${stagedSha?.slice(0, SHORT_SHA_LENGTH) ?? 'none'})`
    );

    return hasChanges;
  } catch (error) {
    config.logger?.debug(`Failed to check gitlink changes for ${submodulePath}: ${String(error)}`);
    // If we can't determine, assume there are changes to be safe
    return true;
  }
}

/**
 * Extracts SHA from git ls-tree output.
 *
 * @param lsTreeOutput - Output from git ls-tree command
 * @returns SHA if found, null otherwise
 */
function extractShaFromLsTree(lsTreeOutput: string): string | null {
  const trimmed = lsTreeOutput.trim();
  if (trimmed === '') {
    return null;
  }

  // git ls-tree format: <mode> <type> <sha> <path>
  // Example: "160000 commit 1234567890abcdef1234567890abcdef12345678 submodule-path"
  const parts = trimmed.split(/\s+/);
  const MIN_LS_TREE_PARTS = 3;
  const SHA_COLUMN_INDEX = 2;
  if (parts.length >= MIN_LS_TREE_PARTS) {
    return parts[SHA_COLUMN_INDEX] ?? null;
  }

  return null;
}

/**
 * Create a gitlink commit for a submodule update.
 *
 * Stages the submodule changes and creates a commit with a standardized message.
 * Respects both dry-run and no-commit modes.
 *
 * @param params - Gitlink commit parameters
 * @param config - Gitlink operation configuration
 * @returns Promise resolving to the gitlink operation result
 * @throws Error if staging or commit creation fails
 *
 * @example
 * ```typescript
 * const result = await commitGitlink(
 *   {
 *     submodule: { name: 'shared', path: 'libs/shared' },
 *     targetSha: 'abc123def456',
 *     branch: 'main'
 *   },
 *   { cwd: '/path/to/repo' }
 * );
 * ```
 */
export async function commitGitlink(
  params: GitlinkCommitParams,
  config: GitlinkConfig = {},
): Promise<GitlinkResult> {
  const { submodule, targetSha, branch } = params;
  const message = formatGitlinkMessage(submodule.path, branch, targetSha);

  config.logger?.debug(`Creating gitlink commit for ${submodule.path}: ${message}`);

  // Stage the submodule changes first
  await stageSubmodule(submodule.path, config);

  // Skip commit creation if noCommit flag is set
  if (config.noCommit === true) {
    config.logger?.info(`Staged ${submodule.path} but skipping commit (--no-commit)`);
    return {
      executed: false,
      message,
    };
  }

  // Create the commit (this respects dry-run mode internally)
  try {
    const commitSha = await createCommit(message, config);

    const wasExecuted = config.dryRun !== true;
    config.logger?.debug(
      `Gitlink commit ${wasExecuted ? 'created' : 'simulated'}: ${commitSha}`,
    );

    return {
      executed: wasExecuted,
      commitSha,
      message,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create gitlink commit for ${submodule.path}: ${errorMessage}`);
  }
}