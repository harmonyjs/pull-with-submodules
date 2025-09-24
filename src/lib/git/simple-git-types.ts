/**
 * @fileoverview TypeScript interfaces for simple-git library results.
 *
 * Provides type-safe interfaces for simple-git operation results
 * to eliminate any types in git operations.
 */

import type { SimpleGit } from "simple-git";

/**
 * Result summary from git pull operation.
 */
export interface GitPullSummary {
  /** Number of changed files */
  readonly changes: number;
  /** Number of inserted lines */
  readonly insertions: number;
  /** Number of deleted lines */
  readonly deletions: number;
}

/**
 * Complete result from git pull operation.
 */
export interface GitPullResult {
  /** Summary of changes */
  readonly summary: GitPullSummary;
  /** Array of changed file paths */
  readonly files: readonly string[];
}

/**
 * Re-export SimpleGit for consistent usage.
 */
export type { SimpleGit };
