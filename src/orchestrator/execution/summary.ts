/**
 * @fileoverview Execution result and summary utilities.
 *
 * Contains functions for creating execution results and displaying
 * summary information to users.
 */

import { formatSummaryTable, createLogger, multilineNote, summaryNote } from "#ui";
import type { ExecutionContext, UpdateResult } from "#types/core";

import { MILLISECONDS_PER_SECOND } from "#orchestrator/constants";
import type { ExecutionResult } from "./index.js";

/**
 * Options for creating execution result.
 */
interface CreateResultOptions {
  environment: {
    gitVersion: string;
    nodeVersion: string;
    repositoryRoot: string;
  };
  submoduleResult: {
    totalSubmodules: number;
    updated: number;
    skipped: number;
    failed: number;
    duration: number;
  };
  workflowResult: {
    mainRepositoryUpdated: boolean;
    stash?: { created: boolean } | null;
    gitlinkCommits: number;
    duration: number;
  };
  totalDuration: number;
  errors: readonly Error[];
}

/**
 * Creates successful execution result from component results.
 */
export function createSuccessResult(
  options: CreateResultOptions,
): ExecutionResult {
  const success =
    options.errors.length === 0 && options.submoduleResult.failed === 0;

  return {
    environment: createEnvironmentResult(options.environment),
    submodules: createSubmoduleResult(options.submoduleResult),
    workflow: createWorkflowResult(options.workflowResult),
    totalDuration: options.totalDuration,
    success,
    errors: options.errors,
  };
}

/**
 * Creates environment result section.
 */
function createEnvironmentResult(env: CreateResultOptions["environment"]): {
  gitVersion: string;
  nodeVersion: string;
  repositoryRoot: string;
} {
  return {
    gitVersion: env.gitVersion,
    nodeVersion: env.nodeVersion,
    repositoryRoot: env.repositoryRoot,
  };
}

/**
 * Creates submodule result section.
 */
function createSubmoduleResult(sub: CreateResultOptions["submoduleResult"]): {
  totalSubmodules: number;
  updated: number;
  skipped: number;
  failed: number;
  duration: number;
} {
  return {
    totalSubmodules: sub.totalSubmodules,
    updated: sub.updated,
    skipped: sub.skipped,
    failed: sub.failed,
    duration: sub.duration,
  };
}

/**
 * Creates workflow result section.
 */
function createWorkflowResult(
  workflow: CreateResultOptions["workflowResult"],
): {
  mainRepositoryUpdated: boolean;
  stashCreated: boolean;
  gitlinkCommits: number;
  duration: number;
} {
  return {
    mainRepositoryUpdated: workflow.mainRepositoryUpdated,
    stashCreated: workflow.stash?.created ?? false,
    gitlinkCommits: workflow.gitlinkCommits,
    duration: workflow.duration,
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
  context: ExecutionContext,
): void {
  const logger = createLogger(context);

  // Show submodule summary table if there were any submodules
  if (result.submodules.totalSubmodules > 0) {
    const summaryTable = formatSummaryTable([...submoduleResults]);
    multilineNote(summaryTable, "Submodule Update Summary");
  }

  // Show final statistics in a summary note
  const stats = [
    `Total: ${result.submodules.totalSubmodules} submodules`,
    `Updated: ${result.submodules.updated}`,
    `Skipped: ${result.submodules.skipped}`,
    result.submodules.failed > 0 ? `Failed: ${result.submodules.failed}` : null,
    `Time: ${(result.totalDuration / MILLISECONDS_PER_SECOND).toFixed(1)}s`,
  ]
    .filter(Boolean)
    .join(" │ ");

  summaryNote(stats);

  // Show gitlink commits if any were created
  if (result.workflow.gitlinkCommits > 0) {
    logger.info(`Created ${result.workflow.gitlinkCommits} gitlink commit(s)`);
  }

  // Show dry-run notice
  if (context.dryRun) {
    logger.warn("Dry-run mode: No actual changes were made");
  }
}
