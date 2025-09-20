/**
 * @fileoverview Execution error handling utilities.
 *
 * Contains functions for handling and formatting execution errors
 * with proper user feedback and recovery suggestions.
 */

import { outro, createLogger } from "#ui";
import { GitOperationError } from "#errors";
import type { ExecutionContext } from "#types/core.js";

import type { ExecutionResult } from "./index.js";

/**
 * Handles execution errors and creates error result.
 *
 * @param options - Error handling context
 * @returns Error execution result
 */
export function handleExecutionError(options: {
  error: unknown;
  errors: Error[];
  context: ExecutionContext;
  startTime: number;
}): ExecutionResult {
  const { error, errors, context, startTime } = options;
  const executionError = error instanceof Error ? error : new Error(String(error));
  errors.push(executionError);

  const logger = createLogger(context);
  logger.error(`Execution failed: ${executionError.message}`);

  if (executionError instanceof GitOperationError) {
    logger.error("Suggestions:");
    for (const suggestion of executionError.suggestions ?? []) {
      logger.error(`  - ${suggestion}`);
    }
  }

  outro("✗ Failed");

  const totalDuration = Date.now() - startTime;

  return {
    environment: {
      gitVersion: "unknown",
      nodeVersion: process.version.slice(1),
      repositoryRoot: context.repositoryRoot,
    },
    submodules: {
      totalSubmodules: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      duration: 0,
    },
    workflow: {
      mainRepositoryUpdated: false,
      stashCreated: false,
      gitlinkCommits: 0,
      duration: 0,
    },
    totalDuration,
    success: false,
    errors,
  };
}