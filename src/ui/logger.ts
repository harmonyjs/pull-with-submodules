/**
 * @fileoverview Minimal logging adapter with execution context integration.
 *
 * Provides level-based logging (debug, info, warn, error) with conditional
 * verbose output. Designed as a thin wrapper around @clack/prompts log methods for
 * consistent TUI formatting across the application.
 *
 * Key features:
 * - Respects ExecutionContext verbose flag for debug output
 * - Uses @clack/prompts for consistent visual styling
 * - Type-safe log levels with standardized formatting
 */

import { log } from "@clack/prompts";
import type { ExecutionContext } from "#types/core";

/**
 * Log level enumeration for type safety and filtering.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Logger interface for dependency injection and testing.
 */
export interface Logger {
  /**
   * Log debug-level information (only when verbose = true).
   *
   * @param message Primary message to log.
   * @param args Additional arguments for string interpolation.
   */
  debug(message: string, ...args: unknown[]): void;

  /**
   * Log informational messages (always shown).
   *
   * @param message Primary message to log.
   * @param args Additional arguments for string interpolation.
   */
  info(message: string, ...args: unknown[]): void;

  /**
   * Log warning messages (always shown with yellow prefix).
   *
   * @param message Primary message to log.
   * @param args Additional arguments for string interpolation.
   */
  warn(message: string, ...args: unknown[]): void;

  /**
   * Log error messages (always shown with red prefix).
   *
   * @param message Primary message to log.
   * @param args Additional arguments for string interpolation.
   */
  error(message: string, ...args: unknown[]): void;
}

/**
 * Clack-based logger implementation with execution context integration.
 */
class ClackLogger implements Logger {
  constructor(private readonly context: ExecutionContext) {}

  debug(message: string, ...args: unknown[]): void {
    if (!this.context.verbose) return;

    // Format message with arguments if provided
    const formattedMessage = args.length > 0
      ? `${message} ${args.map(String).join(' ')}`
      : message;

    log.step(formattedMessage);
  }

  // eslint-disable-next-line class-methods-use-this
  info(message: string, ...args: unknown[]): void {
    // Format message with arguments if provided
    const formattedMessage = args.length > 0
      ? `${message} ${args.map(String).join(' ')}`
      : message;

    log.info(formattedMessage);
  }

  // eslint-disable-next-line class-methods-use-this
  warn(message: string, ...args: unknown[]): void {
    // Format message with arguments if provided
    const formattedMessage = args.length > 0
      ? `${message} ${args.map(String).join(' ')}`
      : message;

    log.warn(formattedMessage);
  }

  // eslint-disable-next-line class-methods-use-this
  error(message: string, ...args: unknown[]): void {
    // Format message with arguments if provided
    const formattedMessage = args.length > 0
      ? `${message} ${args.map(String).join(' ')}`
      : message;

    log.error(formattedMessage);
  }
}

/**
 * Creates a logger instance bound to the provided execution context.
 *
 * @param context Execution context containing verbose and dry-run flags.
 * @returns Logger instance configured for the current execution mode.
 * @example
 * const logger = createLogger(context);
 * logger.info("Starting submodule processing");
 * logger.debug("Detailed debug info only shown when verbose=true");
 */
export function createLogger(context: ExecutionContext): Logger {
  return new ClackLogger(context);
}
