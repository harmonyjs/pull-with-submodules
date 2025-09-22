/**
 * @fileoverview Repository status processing utilities.
 *
 * Contains utilities for processing git repository status and creating
 * appropriate pull results based on ahead/behind status.
 */

import { getRepositoryStatusSymbol } from "#ui/colors";
import type { OperationCallbacks } from "./core.js";

/**
 * Detailed pull operation status.
 */
export type PullStatus =
  | "fast-forward"
  | "no-op"
  | "rebase-applied"
  | "would-rebase"
  | "conflict"
  | "diverged"
  | "ahead"
  | "up-to-date";

/**
 * Pull operation result interface.
 */
export interface PullResult {
  /** Detailed status of the pull operation */
  readonly status: PullStatus;
  /** Number of files changed */
  readonly changes: number;
  /** Number of insertions */
  readonly insertions: number;
  /** Number of deletions */
  readonly deletions: number;
  /** List of changed files */
  readonly files: readonly string[];
  /** Number of commits ahead of remote */
  readonly ahead?: number;
  /** Number of commits behind remote */
  readonly behind?: number;
}

/**
 * Processes repository status and returns appropriate pull result.
 */
export function processRepositoryStatus(
  status: { ahead: number; behind: number },
  callbacks: OperationCallbacks,
): PullResult {
  const symbol = getRepositoryStatusSymbol(status);

  if (status.behind > 0 && status.ahead > 0) {
    return handleDivergedRepository(status, symbol, callbacks);
  } else if (status.behind > 0) {
    return handleBehindRepository(status, symbol, callbacks);
  } else if (status.ahead > 0) {
    return handleAheadRepository(status, symbol, callbacks);
  } else {
    return handleUpToDateRepository(symbol, callbacks);
  }
}

/**
 * Handles the case where the repository has diverged.
 */
function handleDivergedRepository(
  status: { ahead: number; behind: number },
  symbol: string,
  callbacks: OperationCallbacks,
): PullResult {
  callbacks.onSuccess?.(
    `${symbol} Repository has diverged: ${status.ahead} local, ${status.behind} remote commits`,
  );
  return {
    status: "diverged",
    changes: status.behind,
    insertions: 0,
    deletions: 0,
    files: [],
    ahead: status.ahead,
    behind: status.behind,
  };
}

/**
 * Handles the case where the repository is behind remote.
 */
function handleBehindRepository(
  status: { behind: number },
  symbol: string,
  callbacks: OperationCallbacks,
): PullResult {
  callbacks.onSuccess?.(
    `${symbol} Would pull ${status.behind} new commits from origin`,
  );
  return {
    status: "would-rebase",
    changes: status.behind,
    insertions: 0,
    deletions: 0,
    files: [],
    behind: status.behind,
  };
}

/**
 * Handles the case where the repository is ahead of remote.
 */
function handleAheadRepository(
  status: { ahead: number },
  _symbol: string,
  callbacks: OperationCallbacks,
): PullResult {
  callbacks.onSuccess?.(`Repository is ahead by ${status.ahead} commits`);
  return {
    status: "ahead",
    changes: 0,
    insertions: 0,
    deletions: 0,
    files: [],
    ahead: status.ahead,
  };
}

/**
 * Handles the case where the repository is up-to-date.
 */
function handleUpToDateRepository(
  _symbol: string,
  callbacks: OperationCallbacks,
): PullResult {
  callbacks.onSuccess?.("Repository is up-to-date with origin");
  return {
    status: "up-to-date",
    changes: 0,
    insertions: 0,
    deletions: 0,
    files: [],
  };
}
