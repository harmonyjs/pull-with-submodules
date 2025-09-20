/**
 * @fileoverview Barrel for UI interaction & formatting modules (logger, prompts, formatters).
 *
 * Purpose: single stable import surface for user-facing presentation helpers.
 * Side effects (stdout/stderr) are confined to modules re-exported here.
 *
 * Provides complete UI layer functionality for CLI application including
 * logging, user prompts, and output formatting.
 */

// Logger module exports
export { createLogger, type Logger, type LogLevel } from "./logger.js";

// Prompts module exports
export {
  intro,
  outro,
  confirm,
  spinner,
  note,
  handleCancellation,
} from "./prompts.js";

// Formatters module exports
export {
  formatDuration,
  formatGitHash,
  formatSubmodulePath,
  formatSummaryTable,
  formatStatusIcon,
  formatStatistics,
} from "./formatters.js";

// Completion module exports
export { showCompletionMessage } from "./completion.js";
