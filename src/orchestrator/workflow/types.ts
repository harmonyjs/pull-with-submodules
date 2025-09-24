/**
 * @fileoverview Type definitions for workflow operations.
 *
 * Defines interfaces used by the main workflow coordinator for
 * execution results and gitlink commit tracking.
 */

import type { StashResult } from "#orchestrator/stash";
import type { PullResult } from "#lib/git";

/**
 * Main workflow execution result.
 */
export interface WorkflowResult {
  /** Whether the main repository was updated */
  readonly mainRepositoryUpdated: boolean;
  /** Pull operation result with status information */
  readonly pullResult: PullResult | null;
  /** Stash information if created */
  readonly stash: StashResult | null;
  /** Number of submodules processed */
  readonly submodulesProcessed: number;
  /** Number of gitlink commits created */
  readonly gitlinkCommits: number;
  /** Total execution duration in milliseconds */
  readonly duration: number;
  /** Any errors encountered during execution */
  readonly errors: readonly Error[];
}

/**
 * Gitlink commit creation result.
 */
export interface GitlinkCommitResult {
  /** Commit SHA that was created */
  readonly commitSha: string;
  /** Commit message used */
  readonly message: string;
  /** Submodule paths that were updated */
  readonly updatedPaths: readonly string[];
}
