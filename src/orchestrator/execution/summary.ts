/**
 * @fileoverview Execution result and summary utilities.
 *
 * Contains functions for creating execution results and displaying
 * summary information to users.
 */

import { formatSummaryTable, createLogger } from "#ui";
import type { ExecutionContext, UpdateResult } from "#types/core.js";

import { MILLISECONDS_PER_SECOND } from "#orchestrator";
import type { ExecutionResult } from "./index.js";

/**
 * Creates successful execution result from component results.
 *
 * @param options - Component results and metadata
 * @returns Formatted execution result
 */
export function createSuccessResult(options: {
  environment: { gitVersion: string; nodeVersion: string; repositoryRoot: string };
  submoduleResult: { totalSubmodules: number; updated: number; skipped: number; failed: number; duration: number };
  workflowResult: { mainRepositoryUpdated: boolean; stash?: { created: boolean } | null; gitlinkCommits: number; duration: number };
  totalDuration: number;
  errors: readonly Error[];
}): ExecutionResult {
  const { environment, submoduleResult, workflowResult, totalDuration, errors } = options;
  const success = errors.length === 0 && submoduleResult.failed === 0;

  return {
    environment: {
      gitVersion: environment.gitVersion,
      nodeVersion: environment.nodeVersion,
      repositoryRoot: environment.repositoryRoot,
    },
    submodules: {
      totalSubmodules: submoduleResult.totalSubmodules,
      updated: submoduleResult.updated,
      skipped: submoduleResult.skipped,
      failed: submoduleResult.failed,
      duration: submoduleResult.duration,
    },
    workflow: {
      mainRepositoryUpdated: workflowResult.mainRepositoryUpdated,
      stashCreated: workflowResult.stash?.created ?? false,
      gitlinkCommits: workflowResult.gitlinkCommits,
      duration: workflowResult.duration,
    },
    totalDuration,
    success,
    errors,
  };
}

/**
 * Shows execution summary to the user.
 *
 * @param result - Execution result
 * @param submoduleResults - Individual submodule results
 * @param context - Execution context
 */
export function showExecutionSummary(
  result: ExecutionResult,
  submoduleResults: readonly UpdateResult[],
  context: ExecutionContext
): void {
  const logger = createLogger(context);

  // Show submodule summary table if there were any submodules
  if (result.submodules.totalSubmodules > 0) {
    const summaryTable = formatSummaryTable([...submoduleResults]);
    logger.info("\\n" + summaryTable);
  }

  // Show final statistics
  const stats = [
    `Total: ${result.submodules.totalSubmodules} submodules`,
    `Updated: ${result.submodules.updated}`,
    `Skipped: ${result.submodules.skipped}`,
    result.submodules.failed > 0 ? `Failed: ${result.submodules.failed}` : null,
    `Time: ${(result.totalDuration / MILLISECONDS_PER_SECOND).toFixed(1)}s`,
  ].filter(Boolean).join(" │ ");

  logger.info(`\\n${stats}`);

  // Show gitlink commits if any were created
  if (result.workflow.gitlinkCommits > 0) {
    logger.info(`\\nCreated ${result.workflow.gitlinkCommits} gitlink commit(s)`);
  }

  // Show dry-run notice
  if (context.dryRun) {
    logger.info("\\n⚠ Dry-run mode: No actual changes were made");
  }
}