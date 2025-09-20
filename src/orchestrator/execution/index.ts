/**
 * @fileoverview Execution utilities barrel export.
 *
 * Re-exports execution result creation and error handling functions
 * for centralized access to execution-related operations.
 */

// Execution result creation and summary display
export {
  createSuccessResult,
  showExecutionSummary
} from "./summary.js";

// Execution error handling
export {
  handleExecutionError
} from "./error-handler.js";

// Re-export ExecutionResult type from main orchestrator
export type { ExecutionResult } from "#orchestrator";