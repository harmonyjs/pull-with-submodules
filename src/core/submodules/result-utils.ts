/**
 * @fileoverview Utility functions for creating UpdateResult objects.
 *
 * Contains helper functions for creating different types of UpdateResult
 * objects with consistent structure and proper type safety.
 */

import type { Submodule, UpdateResult, CommitSelection } from "#types/core";

/**
 * Creates a skipped result for a submodule.
 */
export function createSkippedResult(
  submodule: Submodule,
  startTime: number,
  selection?: CommitSelection | null,
): UpdateResult {
  return {
    submodule,
    selection: selection ?? null,
    status: "skipped",
    duration: Date.now() - startTime,
  };
}

/**
 * Creates an updated result for a submodule.
 */
export function createUpdatedResult(
  submodule: Submodule,
  selection: CommitSelection,
  startTime: number,
): UpdateResult {
  return {
    submodule,
    selection,
    status: "updated",
    duration: Date.now() - startTime,
  };
}

/**
 * Creates a failed result for a submodule.
 */
export function createFailedResult(
  submodule: Submodule,
  startTime: number,
  error: unknown,
): UpdateResult {
  return {
    submodule,
    selection: null,
    status: "failed",
    duration: Date.now() - startTime,
    error: error instanceof Error ? error : new Error(String(error)),
  };
}
