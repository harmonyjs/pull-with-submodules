/**
 * @fileoverview Completion message handling for CLI application.
 *
 * Provides functions for displaying completion messages to the user
 * including success/error status and execution time formatting.
 */

import { outro } from "./prompts.js";
import { MILLISECONDS_PER_SECOND } from "#orchestrator/constants";
import type { ExecutionResult } from "#orchestrator/index";

/**
 * Shows completion message based on execution result.
 *
 * Displays either success message with execution time or error message
 * depending on the final execution status.
 *
 * @param result - Complete execution result with success status and timing
 */
export function showCompletionMessage(result: ExecutionResult): void {
  if (result.success) {
    const seconds = (result.totalDuration / MILLISECONDS_PER_SECOND).toFixed(1);
    outro(`✨ Done in ${seconds}s`);
  } else {
    outro("❌ Completed with errors");
  }
}
