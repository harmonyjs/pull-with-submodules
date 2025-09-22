/**
 * @fileoverview Logger factory function and exports.
 *
 * Provides a simple factory function to create logger instances
 * bound to execution contexts using the new UIManager architecture.
 */

import type { ExecutionContext } from "#types/core";
import { createUIManager } from "./ui-manager.js";
import type { Logger, Task } from "./types.js";
import { format } from "node:util";
import type { OperationCallbacks } from "#lib/git/core";

/**
 * Logger implementation that wraps UIManager.
 *
 * Provides the Logger interface while delegating to UIManager
 * for actual output operations.
 */
class UIManagerLogger implements Logger {
  constructor(
    private readonly context: ExecutionContext,
    private readonly uiManager = createUIManager({
      // Extract quiet and interactive from context if available, otherwise use defaults
      quiet: (context as any).quiet ?? false,
      interactive: (context as any).interactive,
    }),
  ) {}

  debug(message: string, ...args: unknown[]): void {
    if (this.context.verbose) {
      const formatted = this.formatMessage(message, args);
      this.uiManager.log("debug", formatted);
    }
  }

  verbose(message: string, ...args: unknown[]): void {
    if (this.context.verbose) {
      const formatted = this.formatMessage(message, args);
      this.uiManager.log("verbose", formatted);
    }
  }

  info(message: string, ...args: unknown[]): void {
    const formatted = this.formatMessage(message, args);
    this.uiManager.log("info", formatted);
  }

  warn(message: string, ...args: unknown[]): void {
    const formatted = this.formatMessage(message, args);
    this.uiManager.log("warn", formatted);
  }

  error(message: string, ...args: unknown[]): void {
    const formatted = this.formatMessage(message, args);
    this.uiManager.log("error", formatted);
  }

  async withSpinner<T>(
    message: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    return this.uiManager.withSpinner(message, operation);
  }

  async withTasks(tasks: Task[]): Promise<void> {
    return this.uiManager.withTasks(tasks);
  }

  createCallbacks(): OperationCallbacks {
    return {
      onProgress: (msg) => this.verbose(msg),
      onSuccess: (msg) => this.info(msg),
      onError: (msg) => this.error(msg),
      onWarning: (msg) => this.warn(msg),
    };
  }

  /**
   * Format message with arguments using util.format.
   */
  private formatMessage(message: string, args: unknown[]): string {
    if (args.length === 0) {
      return message;
    }
    return format(message, ...args);
  }
}

/**
 * Creates a logger instance bound to the provided execution context.
 *
 * @param context Execution context containing verbose and other flags.
 * @returns Logger instance configured for the current execution mode.
 * @example
 * const logger = createLogger(context);
 * logger.info("Starting submodule processing");
 * logger.verbose("Detailed debug info only shown when verbose=true");
 */
export function createLogger(context: ExecutionContext): Logger {
  return new UIManagerLogger(context);
}

// Re-export types for other modules
export type {
  Logger,
  BaseLogger,
  UIOperations,
  LogLevel,
  Task,
} from "./types.js";
