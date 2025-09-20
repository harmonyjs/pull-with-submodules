/**
 * @fileoverview Main workflow coordinator.
 *
 * Orchestrates the primary pull-with-submodules workflow including repository pull,
 * stash management, and gitlink operations with proper error handling and user feedback.
 */

import type { GitOperationConfig } from "#lib/git";
import { createLogger } from "#ui";
import type { ExecutionContext, UpdateResult } from "#types/core";

import type { StashResult } from "#orchestrator/stash";
import { restoreStashSafely } from "./helpers.js";
import {
  handleUncommittedChanges,
  pullMainRepository,
} from "./pull-operations.js";
import { handleWorkflowError } from "./error-handler.js";
import type { WorkflowResult } from "./types.js";

// Re-export types for convenience
export type { WorkflowResult } from "./types.js";

/**
 * Executes the main workflow for pulling repository with submodules.
 *
 * @param context - Execution context with user preferences
 * @param submoduleResults - Results from submodule processing
 * @returns Promise resolving to workflow execution result
 */
export async function executeMainWorkflow(
  context: ExecutionContext,
  submoduleResults: readonly UpdateResult[] = [],
): Promise<WorkflowResult> {
  const startTime = Date.now();
  const errors: Error[] = [];
  const logger = createLogger(context);
  const gitConfig: GitOperationConfig = {
    cwd: context.repositoryRoot,
    dryRun: context.dryRun,
    logger,
  };

  logger.verbose("Starting main workflow execution");

  let stash: StashResult | null = null;
  let mainRepositoryUpdated = false;
  const gitlinkCommits = 0;

  try {
    // Step 1: Handle uncommitted changes
    stash = await handleUncommittedChanges(gitConfig);

    // Step 2: Pull main repository
    mainRepositoryUpdated = await pullMainRepository(gitConfig);

    // Step 3: Gitlink commits will be applied later after submodule processing
    // (in the main orchestrator)

    // Step 4: Restore stash if created
    if (stash !== null && stash.created === true) {
      await restoreStashSafely(stash, gitConfig);
    }

    const duration = Date.now() - startTime;
    logger.verbose(`Main workflow completed in ${duration}ms`);

    return {
      mainRepositoryUpdated,
      stash,
      submodulesProcessed: 0, // Submodules will be processed later
      gitlinkCommits: 0, // Gitlink commits will be applied later
      duration,
      errors,
    };
  } catch (error) {
    return handleWorkflowError(error, {
      stash,
      context,
      gitConfig,
      state: {
        mainRepositoryUpdated,
        submoduleResults,
        gitlinkCommits,
        startTime,
      },
    });
  }
}
