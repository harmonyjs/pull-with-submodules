/**
 * @fileoverview Smart commit selection strategies for submodule updates.
 *
 * This module implements the core decision logic for choosing between local and remote
 * commits when updating submodules. The primary strategy (`selectCommitSmart`) prefers
 * local sibling repositories when they contain all remote changes, falling back to
 * remote sources when histories have diverged or local is not available.
 *
 * The strategy is pure and testable, accepting dependency injection for Git operations.
 */

import type { CommitSelection } from "../../types/core.js";
import {
  createGitAncestryChecker,
  type AncestryChecker,
} from "./ancestry-checker.js";
import { isValidSha } from "./helpers.js";

/**
 * Options for commit selection strategy configuration.
 */
export interface CommitSelectionOptions {
  /** Force preference for remote commits over local ones */
  readonly forceRemote: boolean;
  /** Working directory for git ancestry checks */
  readonly cwd?: string;
  /** Optional custom ancestry checker for testing */
  readonly ancestryChecker?: AncestryChecker;
}

function handleForcedRemote(remoteSha: string | null): CommitSelection | null {
  if (isValidSha(remoteSha)) {
    return {
      sha: remoteSha,
      source: "remote",
      reason: "forced by --force-remote flag",
    };
  }
  return null;
}

async function handleBothAvailable(
  localSha: string,
  remoteSha: string,
  ancestryChecker: AncestryChecker,
): Promise<CommitSelection> {
  try {
    const ancestryResult = await ancestryChecker.isAncestor(
      remoteSha,
      localSha,
    );

    if (ancestryResult.isAncestor) {
      return {
        sha: localSha,
        source: "local",
        reason: "local contains all remote changes",
      };
    } else {
      return {
        sha: remoteSha,
        source: "remote",
        reason: "remote has diverged from local",
      };
    }
  } catch (error) {
    return {
      sha: remoteSha,
      source: "remote",
      reason: `ancestry check failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function handleSingleSource(
  localSha: string | null,
  remoteSha: string | null,
): CommitSelection | null {
  if (isValidSha(localSha)) {
    return {
      sha: localSha,
      source: "local",
      reason: "only local source available",
    };
  }

  if (isValidSha(remoteSha)) {
    return {
      sha: remoteSha,
      source: "remote",
      reason: "only remote source available",
    };
  }

  return null;
}

/**
 * Smart commit selection strategy that chooses between local and remote commits.
 *
 * Selection logic:
 * 1. If `forceRemote` is true, always prefer remote when available
 * 2. If both local and remote exist, check ancestry
 * 3. If only one source is available, use it
 * 4. If neither is available, return null (skip update)
 */
export async function selectCommitSmart(
  localSha: string | null,
  remoteSha: string | null,
  options: CommitSelectionOptions,
): Promise<CommitSelection | null> {
  const { forceRemote, ancestryChecker } = options;

  // Force remote takes absolute precedence
  if (forceRemote) {
    return handleForcedRemote(remoteSha);
  }

  // Both available - check ancestry to make smart decision
  const hasLocal = isValidSha(localSha);
  const hasRemote = isValidSha(remoteSha);

  if (hasLocal && hasRemote) {
    const checker = ancestryChecker ?? createGitAncestryChecker(options.cwd);
    return handleBothAvailable(localSha, remoteSha, checker);
  }

  // Single source or no sources available
  return handleSingleSource(localSha, remoteSha);
}
