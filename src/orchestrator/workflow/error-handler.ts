/**
 * @fileoverview Workflow error handling utilities.
 *
 * Contains functions for handling and recovering from workflow errors
 * with proper cleanup and state management.
 *
 * Rationale: Emergency stash restore prioritizes preserving user work over
 * workflow completion; errors during restore are logged but don't block
 * the primary error reporting.
 */

import type { ExecutionContext, UpdateResult } from "#types/core";
import type { GitOperationConfig } from "#lib/git";

import { restoreStashSafely } from "./helpers.js";
import type { StashResult } from "#orchestrator/stash";
import type { WorkflowResult } from "./types.js";

/**
 * Context for error handling operations.
 */
interface ErrorHandlingContext {
  readonly stash: StashResult | null;
  readonly context: ExecutionContext;
  readonly gitConfig: GitOperationConfig;
  readonly state: {
    readonly mainRepositoryUpdated: boolean;
    readonly submoduleResults: readonly UpdateResult[];
    readonly gitlinkCommits: number;
    readonly startTime: number;
  };
}

/**
 * Handles workflow errors with proper cleanup and error reporting.
 *
 * @param error - The error that occurred
 * @param errorContext - Context for error handling including stash and state
 * @returns Promise resolving to error workflow result
 */
export async function handleWorkflowError(
  error: unknown,
  errorContext: ErrorHandlingContext,
): Promise<WorkflowResult> {
  const workflowError =
    error instanceof Error ? error : new Error(String(error));
  const errors: Error[] = [workflowError];
  const { stash, gitConfig, state } = errorContext;

  // Attempt emergency stash restore if needed
  if (stash?.created === true) {
    try {
      await restoreStashSafely(stash, gitConfig, errorContext.context);
    } catch (restoreError) {
      const errorString =
        restoreError instanceof Error
          ? restoreError.message
          : String(restoreError);
      gitConfig.logger?.error(
        `Failed to restore stash during error recovery: ${errorString}`,
      );
      errors.push(
        restoreError instanceof Error
          ? restoreError
          : new Error(String(restoreError)),
      );
    }
  }

  const duration = Date.now() - state.startTime;
  return {
    mainRepositoryUpdated: state.mainRepositoryUpdated,
    pullResult: null, // Error occurred, no valid pull result
    stash,
    submodulesProcessed: state.submoduleResults.length,
    gitlinkCommits: state.gitlinkCommits,
    duration,
    errors,
  };
}
