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

import type { CommitSelection } from "#types/core";
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
    const remoteIsAncestorOfLocal = await ancestryChecker.isAncestor(
      remoteSha,
      localSha,
    );

    if (remoteIsAncestorOfLocal.isAncestor) {
      return {
        sha: localSha,
        source: "local",
        reason: "local contains all remote changes",
      };
    }

    // When histories diverged, check if local is behind remote
    const localIsAncestorOfRemote = await ancestryChecker.isAncestor(
      localSha,
      remoteSha,
    );

    if (localIsAncestorOfRemote.isAncestor) {
      return {
        sha: remoteSha,
        source: "remote",
        reason: "local is behind remote",
      };
    }

    // Both have unique commits - prefer local (active development)
    return {
      sha: localSha,
      source: "local",
      reason: "local has unpushed changes",
    };
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
 * ## Selection Logic:
 * 1. **Force Remote**: If `forceRemote` flag is true, always prefer remote when available
 * 2. **Ancestry Check**: When both local and remote exist, perform git ancestry analysis:
 *    - If remote is ancestor of local → use **local** (local contains all remote changes)
 *    - If local is ancestor of remote → use **remote** (local is behind remote)
 *    - If both have unique commits → use **local** (prefer active development)
 * 3. **Single Source**: If only one source available, use it
 * 4. **No Sources**: If neither available, return null (skip update)
 *
 * ## Design Decision: Local Priority on Diverged Histories
 *
 * When histories have diverged (both local and remote have unique commits), we prefer
 * the local sibling repository. This reflects the development workflow where:
 * - Local siblings contain active development work
 * - Unpushed commits represent current progress
 * - Developers expect their local changes to take precedence
 *
 * This decision prioritizes developer productivity over safety, assuming local changes
 * are intentional and represent the desired state for submodule updates.
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
