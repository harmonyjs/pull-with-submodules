/**
 * @fileoverview Logger factory function and exports.
 *
 * Provides a simple factory function to create logger instances
 * bound to execution contexts using the centralized TUI State Manager.
 */

import type { ExecutionContext } from "#types/core";
import { TUIStateManager } from "./tui-state-manager.js";
import type { Logger, LogImplementation } from "./types.js";

/**
 * Creates a logger instance bound to the provided execution context.
 *
 * @param context Execution context containing verbose and dry-run flags.
 * @param logImpl Optional log implementation for testing.
 * @returns Logger instance configured for the current execution mode.
 * @example
 * const logger = createLogger(context);
 * logger.info("Starting submodule processing");
 * logger.verbose("Detailed debug info only shown when verbose=true");
 */
export function createLogger(
  context: ExecutionContext,
  logImpl?: LogImplementation,
): Logger {
  return TUIStateManager.getInstance(context, logImpl);
}

// Re-export types and TUIStateManager for other modules
export { TUIStateManager } from "./tui-state-manager.js";
export type {
  Logger,
  BaseLogger,
  UIOperations,
  IBufferedLogger,
  LogLevel,
  Task,
  LogImplementation,
} from "./types.js";
