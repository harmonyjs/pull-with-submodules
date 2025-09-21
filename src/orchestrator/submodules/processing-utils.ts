/**
 * @fileoverview Utilities for submodule processing operations.
 *
 * Contains helper functions for parsing, calculating summaries, and formatting
 * status text used by the submodule orchestrator components.
 */

import { parseSubmodules } from "#core";
import type { ExecutionContext, UpdateResult, Submodule } from "#types/core";
import { spinner, log } from "@clack/prompts";
import { SHORT_SHA_LENGTH } from "#lib/git/sha-utils";
import { isInteractiveEnvironment } from "#ui/tty";
import { symbols } from "#ui/colors";

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
  if (!isInteractiveEnvironment()) {
    // Non-interactive environment: use simple logging with consolidated message
    try {
      const submodules = await parseSubmodules(context.repositoryRoot, context);
      log.info(`${symbols.success} Found ${submodules.length} submodule(s)`);
      return submodules;
    } catch (error) {
      log.error(`${symbols.error} Failed to parse .gitmodules`);
      throw error;
    }
  }

  // Interactive environment: use spinner
  const s = spinner();
  try {
    s.start("Parse .gitmodules");

    const submodules = await parseSubmodules(context.repositoryRoot, context);
    s.stop(`Found ${submodules.length} submodule(s)`);
    return submodules;
  } catch (error) {
    s.stop("Failed to parse .gitmodules");
    throw error;
  } finally {
    try {
      s.stop();
    } catch {
      // Ignore errors when stopping spinner
    }
  }
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
