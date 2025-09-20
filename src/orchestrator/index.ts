/**
 * @fileoverview Main orchestrator entry point.
 *
 * Coordinates the complete pull-with-submodules workflow by integrating
 * environment validation, submodule processing, and main repository operations.
 */

import { intro, createLogger } from "#ui";
import type { ExecutionContext, UpdateResult } from "#types/core";

import { validateEnvironment } from "./environment.js";
import { processSubmodules } from "./submodules/index.js";
import { executeMainWorkflow } from "./workflow/index.js";
import { createSuccessResult, showExecutionSummary, handleExecutionError } from "./execution/index.js";

/**
 * Complete execution result.
 */
export interface ExecutionResult {
  /** Environment validation result */
  readonly environment: {
    gitVersion: string;
    nodeVersion: string;
    repositoryRoot: string;
  };
  /** Submodule processing summary */
  readonly submodules: {
    totalSubmodules: number;
    updated: number;
    skipped: number;
    failed: number;
    duration: number;
  };
  /** Main workflow result */
  readonly workflow: {
    mainRepositoryUpdated: boolean;
    stashCreated: boolean;
    gitlinkCommits: number;
    duration: number;
  };
  /** Total execution duration */
  readonly totalDuration: number;
  /** Success status */
  readonly success: boolean;
  /** Collected errors */
  readonly errors: readonly Error[];
}

/**
 * Executes the complete pull-with-submodules operation.
 *
 * @param context - Execution context with user preferences
 * @returns Promise resolving to execution result
 */
export async function executeComplete(context: ExecutionContext): Promise<ExecutionResult> {
  const startTime = Date.now();
  const logger = createLogger(context);
  const errors: Error[] = [];

  // Show intro
  intro();

  // Announce dry-run mode if enabled
  if (context.dryRun) {
    logger.info("Running in DRY-RUN mode - no changes will be made");
  }

  try {
    // Step 1: Validate environment
    logger.debug("Starting environment validation");
    const environment = await validateEnvironment(context.repositoryRoot);
    logger.debug(`Environment validated: Git ${environment.gitVersion}, Node ${environment.nodeVersion}`);

    // Step 2: Process submodules
    logger.debug("Starting submodule processing");
    const submoduleResult = await processSubmodules(context);

    // Step 3: Execute main workflow
    logger.debug("Starting main workflow");
    const workflowResult = await executeMainWorkflow(context, submoduleResult.results as UpdateResult[]);

    // Collect any workflow errors
    errors.push(...workflowResult.errors);

    // Calculate final result
    const totalDuration = Date.now() - startTime;
    const result = createSuccessResult({
      environment,
      submoduleResult,
      workflowResult,
      totalDuration,
      errors,
    });

    // Show summary
    showExecutionSummary(result, submoduleResult.results, context);

    return result;
  } catch (error) {
    return handleExecutionError({ error, errors, context, startTime });
  }
}

// Re-export constants for internal orchestrator use
export { MAX_PARALLEL_SUBMODULES, MILLISECONDS_PER_SECOND } from "./constants.js";
