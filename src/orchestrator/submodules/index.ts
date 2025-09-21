/**
 * @fileoverview Submodule processing orchestrator.
 *
 * Coordinates the processing of submodules in sequential or parallel mode,
 * using the core submodule processor with proper error handling and progress reporting.
 */

import { createParallelRunner, type ParallelResult } from "#lib/async";
import { createLogger } from "#ui";
import { GitOperationError } from "#errors";
import type { ExecutionContext, UpdateResult, Submodule } from "#types/core";
import { spinner, log } from "@clack/prompts";
import { isInteractiveEnvironment } from "#ui/tty";
import { symbols } from "#ui/colors";

import { MAX_PARALLEL_SUBMODULES } from "#orchestrator";
import {
  parseSubmodulesWithProgress,
  calculateProcessingSummary,
  getStatusText,
} from "./processing-utils.js";
import { processSubmoduleWithErrorHandling } from "./processor.js";

/**
 * Submodule processing summary.
 */
export interface SubmoduleProcessingSummary {
  /** Total number of submodules found */
  readonly totalSubmodules: number;
  /** Number of successfully updated submodules */
  readonly updated: number;
  /** Number of skipped submodules */
  readonly skipped: number;
  /** Number of failed submodules */
  readonly failed: number;
  /** Total processing duration in milliseconds */
  readonly duration: number;
  /** Individual submodule results */
  readonly results: readonly UpdateResult[];
}

/**
 * Processes all submodules in a repository.
 *
 * @param context - Execution context
 * @returns Promise resolving to processing summary
 * @throws GitOperationError if submodule parsing or processing fails
 */
export async function processSubmodules(
  context: ExecutionContext,
): Promise<SubmoduleProcessingSummary> {
  const startTime = Date.now();
  const logger = createLogger(context);

  logger.verbose("Starting submodule processing");

  try {
    // Parse .gitmodules file
    const submodules = await parseSubmodulesWithProgress(context);

    if (submodules.length === 0) {
      logger.verbose("No submodules found in repository");
      return {
        totalSubmodules: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        duration: Date.now() - startTime,
        results: [],
      };
    }

    // Process submodules based on parallel preference
    const results = context.parallel
      ? await processSubmodulesInParallel(submodules, context)
      : await processSubmodulesSequentially(submodules, context);

    // Calculate summary statistics
    const summary = calculateProcessingSummary(results, startTime);

    logger.verbose(
      `Submodule processing completed: ${summary.updated} updated, ${summary.skipped} skipped, ${summary.failed} failed`,
    );

    return summary;
  } catch (error) {
    throw new GitOperationError("Submodule processing failed", {
      cause: error as Error,
      suggestions: ["Check .gitmodules file", "Verify submodule paths exist"],
    });
  }
}

/**
 * Processes submodules sequentially.
 *
 * @param submodules - List of submodules to process
 * @param context - Execution context
 * @returns Promise resolving to processing results
 */
async function processSubmodulesSequentially(
  submodules: readonly Submodule[],
  context: ExecutionContext,
): Promise<readonly UpdateResult[]> {
  const logger = createLogger(context);
  const results: UpdateResult[] = [];

  logger.verbose(`Processing ${submodules.length} submodules sequentially`);

  if (!isInteractiveEnvironment()) {
    // Non-interactive environment: use simple logging
    for (let i = 0; i < submodules.length; i++) {
      const submodule = submodules[i];
      if (submodule === undefined) {
        throw new Error(`Submodule at index ${i} is undefined`);
      }

      log.info(`${symbols.process} [${i + 1}/${submodules.length}] Process submodule: ${submodule.path}...`);

      const result = await processSubmoduleWithErrorHandling(submodule, context);
      results.push(result);

      const statusText = getStatusText(result);
      log.info(`${symbols.success} [${i + 1}/${submodules.length}] ${submodule.path} - ${statusText}`);

      if (result.status === "failed") {
        logger.error(
          `Failed to process ${submodule.path}: ${result.error?.message ?? "Unknown error"}`,
        );
      }
    }
    return results;
  }

  // Interactive environment: use spinners
  for (let i = 0; i < submodules.length; i++) {
    const submodule = submodules[i];
    if (submodule === undefined) {
      throw new Error(`Submodule at index ${i} is undefined`);
    }

    const s = spinner();
    try {
      s.start(`[${i + 1}/${submodules.length}] Process submodule: ${submodule.path}`);

      const result = await processSubmoduleWithErrorHandling(submodule, context);
      results.push(result);

      const statusText = getStatusText(result);
      s.stop(`[${i + 1}/${submodules.length}] ${submodule.path} - ${statusText}`);

      if (result.status === "failed") {
        logger.error(
          `Failed to process ${submodule.path}: ${result.error?.message ?? "Unknown error"}`,
        );
      }
    } finally {
      try {
        s.stop();
      } catch {
        // Ignore errors when stopping spinner
      }
    }
  }

  return results;
}

/**
 * Processes submodules in parallel with concurrency limit.
 */
async function processSubmodulesInParallel(
  submodules: readonly Submodule[],
  context: ExecutionContext,
): Promise<readonly UpdateResult[]> {
  const logger = createLogger(context);

  logger.verbose(
    `Processing ${submodules.length} submodules in parallel (max 4 concurrent)`,
  );

  if (!isInteractiveEnvironment()) {
    // Non-interactive environment: use simple logging
    log.info(`${symbols.process} Process ${submodules.length} submodules in parallel...`);
    try {
      const results = await runParallelSubmoduleProcessing(submodules, context);
      const summary = summarizeParallelResults(results);

      log.info(
        `${symbols.success} Completed: ${summary.updated} updated, ${summary.skipped} skipped, ${summary.failed} failed`,
      );

      return results;
    } catch (error) {
      log.error(`${symbols.error} Parallel processing failed`);
      throw error;
    }
  }

  // Interactive environment: use spinner
  const s = spinner();
  try {
    s.start(`Process ${submodules.length} submodules in parallel`);

    const results = await runParallelSubmoduleProcessing(submodules, context);
    const summary = summarizeParallelResults(results);

    s.stop(
      `Completed: ${summary.updated} updated, ${summary.skipped} skipped, ${summary.failed} failed`,
    );

    return results;
  } catch (error) {
    s.stop("Parallel processing failed");
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
 * Runs parallel processing for submodules.
 */
async function runParallelSubmoduleProcessing(
  submodules: readonly Submodule[],
  context: ExecutionContext,
): Promise<UpdateResult[]> {
  const runParallel = createParallelRunner<UpdateResult>(
    MAX_PARALLEL_SUBMODULES,
  );

  const processingFunctions = submodules.map(
    (submodule) => (): Promise<UpdateResult> =>
      processSubmoduleWithErrorHandling(submodule, context),
  );

  const parallelResults = await runParallel(processingFunctions);
  return convertParallelResultsToUpdateResults(parallelResults, submodules);
}

/**
 * Converts parallel results to update results.
 */
function convertParallelResultsToUpdateResults(
  parallelResults: ParallelResult<UpdateResult>[],
  submodules: readonly Submodule[],
): UpdateResult[] {
  return parallelResults.map((result, index) => {
    if (result.success) {
      return result.value;
    }

    const submodule = submodules[index];
    if (submodule === undefined) {
      throw new Error(
        `Submodule at index ${index} is undefined during parallel processing`,
      );
    }

    return {
      submodule,
      selection: null,
      status: "failed" as const,
      duration: result.duration,
      error: result.error,
    };
  });
}

/**
 * Summarizes parallel processing results.
 */
function summarizeParallelResults(results: readonly UpdateResult[]): {
  updated: number;
  skipped: number;
  failed: number;
} {
  return {
    updated: results.filter((r) => r.status === "updated").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
  };
}
