/**
 * @fileoverview Main orchestrator entry point.
 *
 * Coordinates the complete pull-with-submodules workflow by integrating
 * environment validation, submodule processing, and main repository operations.
 */

import { intro, createLogger, showCompletionMessage } from "#ui";
import type { ExecutionContext } from "#types/core";
import type { PullResult } from "#lib/git";

import {
  validateEnvironment,
  type EnvironmentValidation,
} from "./environment.js";
import {
  processSubmodules,
  type SubmoduleProcessingSummary,
} from "./submodules/index.js";
import { executeMainWorkflow, type WorkflowResult } from "./workflow/index.js";
import {
  createSuccessResult,
  showExecutionSummary,
  handleExecutionError,
} from "./execution/index.js";

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
    pullResult: PullResult | null;
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
 */
export async function executeComplete(
  context: ExecutionContext,
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const errors: Error[] = [];

  showIntroduction(context);

  try {
    const environment = await validateExecutionEnvironment(context);
    const workflowResult = await executeMainWorkflow(context, []);
    const submoduleResult = await processSubmodules(context);
    const gitlinkCommits = await applyGitlinkCommitsIfNeeded(
      context,
      submoduleResult,
    );

    errors.push(...workflowResult.errors);

    const result = buildFinalResult({
      environment,
      submoduleResult,
      workflowResult,
      gitlinkCommits,
      totalDuration: Date.now() - startTime,
      errors,
    });

    showExecutionSummary(result, submoduleResult.results, context);
    showCompletionMessage(result);

    return result;
  } catch (error) {
    return handleExecutionError({ error, errors, context, startTime });
  }
}

/**
 * Shows introduction and dry-run notice.
 */
function showIntroduction(context: ExecutionContext): void {
  intro();
  if (context.dryRun) {
    const logger = createLogger(context);
    logger.info("Running in DRY-RUN mode - no changes will be made");
  }
}

/**
 * Validates execution environment.
 */
async function validateExecutionEnvironment(
  context: ExecutionContext,
): Promise<EnvironmentValidation> {
  const logger = createLogger(context);
  logger.verbose("Starting environment validation");
  const environment = await validateEnvironment(context.repositoryRoot);
  logger.verbose(
    `Environment validated: Git ${environment.gitVersion}, Node ${environment.nodeVersion}`,
  );
  return environment;
}

/**
 * Applies gitlink commits if not disabled.
 */
async function applyGitlinkCommitsIfNeeded(
  context: ExecutionContext,
  submoduleResult: SubmoduleProcessingSummary,
): Promise<number> {
  const logger = createLogger(context);
  logger.verbose("Applying gitlink commits for submodule updates");

  if (context.noCommit) {
    return 0;
  }

  const { applyGitlinkCommits } = await import("./workflow/helpers.js");
  const gitConfig = {
    cwd: context.repositoryRoot,
    dryRun: context.dryRun,
    logger,
  };
  return applyGitlinkCommits([...submoduleResult.results], gitConfig, context);
}

/**
 * Builds final execution result.
 */
function buildFinalResult(options: {
  environment: EnvironmentValidation;
  submoduleResult: SubmoduleProcessingSummary;
  workflowResult: WorkflowResult;
  gitlinkCommits: number;
  totalDuration: number;
  errors: Error[];
}): ExecutionResult {
  return createSuccessResult({
    environment: options.environment,
    submoduleResult: options.submoduleResult,
    workflowResult: {
      ...options.workflowResult,
      gitlinkCommits: options.gitlinkCommits,
    },
    totalDuration: options.totalDuration,
    errors: options.errors,
  });
}

// Re-export constants for internal orchestrator use
export { MAX_PARALLEL_SUBMODULES } from "./constants.js";
