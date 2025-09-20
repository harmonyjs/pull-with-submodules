/**
 * @fileoverview Submodule processor module.
 *
 * Provides barrel exports for all processor-related functionality including
 * the main implementation class, executor, selector, and helper utilities.
 */

// Main implementation
export { SubmoduleProcessorImpl } from "./implementation.js";

// Executor and selector components
export { SubmoduleUpdateExecutor } from "./executor.js";
export { SubmoduleCommitSelector } from "./selector.js";

// Helper utilities
export {
  validateAndLogPaths,
  logPlanDetails,
  createPathCache,
} from "./helpers.js";
