/**
 * @fileoverview Utility functions for creating UpdateResult objects.
 *
 * Contains helper functions for creating different types of UpdateResult
 * objects with consistent structure and proper type safety.
 */

import type {
  Submodule,
  UpdateResult,
  CommitSelection,
  ExecutionContext,
} from "#types/core";

/**
 * Minimal non-zero duration for dry-run mode to maintain UI consistency.
 */
const DRY_RUN_MINIMAL_DURATION_MS = 1;

/**
 * Calculates duration for result, using minimal time in dry-run mode.
 *
 * @param startTime - Start timestamp in milliseconds
 * @param context - Execution context containing dry-run flag
 * @returns Duration in milliseconds
 */
function calculateDuration(
  startTime: number,
  context?: ExecutionContext,
): number {
  if (context?.dryRun === true) {
    return DRY_RUN_MINIMAL_DURATION_MS;
  }
  return Date.now() - startTime;
}

/**
 * Creates a skipped result for a submodule.
 */
export function createSkippedResult(params: {
  submodule: Submodule;
  startTime: number;
  selection?: CommitSelection | null;
  context?: ExecutionContext;
}): UpdateResult {
  return {
    submodule: params.submodule,
    selection: params.selection ?? null,
    status: "skipped",
    duration: calculateDuration(params.startTime, params.context),
  };
}

/**
 * Creates an updated result for a submodule.
 */
export function createUpdatedResult(params: {
  submodule: Submodule;
  selection: CommitSelection;
  startTime: number;
  context?: ExecutionContext;
}): UpdateResult {
  return {
    submodule: params.submodule,
    selection: params.selection,
    status: "updated",
    duration: calculateDuration(params.startTime, params.context),
  };
}

/**
 * Creates a failed result for a submodule.
 */
export function createFailedResult(params: {
  submodule: Submodule;
  startTime: number;
  error: unknown;
  context?: ExecutionContext;
}): UpdateResult {
  return {
    submodule: params.submodule,
    selection: null,
    status: "failed",
    duration: calculateDuration(params.startTime, params.context),
    error:
      params.error instanceof Error
        ? params.error
        : new Error(String(params.error)),
  };
}
