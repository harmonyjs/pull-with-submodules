/**
 * @fileoverview Barrel for UI interaction & formatting modules (logger, prompts, formatters).
 *
 * Purpose: single stable import surface for user-facing presentation helpers.
 * Side effects (stdout/stderr) are confined to modules re-exported here.
 *
 * Provides complete UI layer functionality for CLI application including
 * logging, user prompts, and output formatting.
 */

// Logger module exports (new UIManager architecture)
export { createLogger } from "./logger.js";
export { createUIManager } from "./ui-manager.js";
export type { Logger, LogLevel, Task } from "./types.js";

// Prompts module exports
export {
  intro,
  outro,
  confirm,
  note,
  multilineNote,
  summaryNote,
  handleCancellation,
} from "./prompts.js";

// Formatters module exports
export {
  formatDuration,
  formatGitHash,
  formatSubmodulePath,
  formatSummaryTable,
  formatStatistics,
} from "./formatters.js";

// Completion module exports
export { showCompletionMessage } from "./completion.js";

// Color utilities exports
export {
  status,
  symbols,
  backgrounds,
  styles,
  colorizeStatus,
} from "./colors.js";

// UI constants exports
export {
  UI_SYMBOLS,
  UI_FORMATTING,
  UI_TIMING,
  CLI_CONSTANTS,
  type UISymbolKey,
  type UIFormattingKey,
} from "./constants.js";

// Destination exports
export type { LogDestination, SpinnerHandle, TaskHandle } from "./destinations/base.js";

// Next steps exports
export {
  generateNextSteps,
  formatNextSteps,
  showNextSteps,
  type NextStep,
  type NextStepsContext,
} from "./next-steps.js";

// TTY detection exports
export {
  getUIEnvironment,
  isInteractiveEnvironment,
  isNonInteractiveEnvironment,
  type UIEnvironment,
} from "./tty.js";
