/**
 * @fileoverview Utilities for submodule processing operations.
 *
 * Contains helper functions for parsing, calculating summaries, and formatting
 * status text used by the submodule orchestrator components.
 */

import { parseSubmodules } from "#core";
import type { ExecutionContext, UpdateResult, Submodule } from "#types/core";
import { createLogger } from "#ui";
import { SHORT_SHA_LENGTH } from "#lib/git/sha-utils";

import type { SubmoduleProcessingSummary } from "./index.js";

/**
 * Parses submodules with progress indication.
 *
 * @param context - Execution context
 * @returns Promise resolving to list of submodules
 */
export async function parseSubmodulesWithProgress(
  context: ExecutionContext,
): Promise<readonly Submodule[]> {
  const logger = createLogger(context);

  return await logger.withSpinner("Parse .gitmodules", async () => {
    const submodules = await parseSubmodules(context.repositoryRoot, context);
    logger.info(`Found ${submodules.length} submodule(s)`);
    return submodules;
  });
}

/**
 * Calculates processing summary from individual results.
 *
 * @param results - Array of individual submodule results
 * @param startTime - Processing start timestamp
 * @returns Aggregated processing summary
 */
export function calculateProcessingSummary(
  results: readonly UpdateResult[],
  startTime: number,
): SubmoduleProcessingSummary {
  const updated = results.filter((r) => r.status === "updated").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return {
    totalSubmodules: results.length,
    updated,
    skipped,
    failed,
    duration: Date.now() - startTime,
    results,
  };
}

/**
 * Formats status text for display in progress indicators.
 *
 * @param result - Submodule processing result
 * @returns Formatted status string
 */
export function getStatusText(result: UpdateResult): string {
  switch (result.status) {
    case "updated":
      return `+ Updated to ${result.selection?.source ?? "unknown"} @ ${result.selection?.sha.slice(0, SHORT_SHA_LENGTH) ?? "unknown"}`;
    case "up-to-date":
      return "= Already up-to-date";
    case "skipped":
      return "- Skipped";
    case "failed":
      return `x Failed: ${result.error?.message ?? "unknown error"}`;
    default:
      return "? Unknown status";
  }
}
