/**
 * @fileoverview Minimal logging adapter with execution context integration.
 *
 * Provides level-based logging (debug, info, warn, error) with conditional
 * verbose output and dry-run prefixing. Designed as a thin wrapper around
 * console methods for consistent formatting across the application.
 *
 * Key features:
 * - Respects ExecutionContext verbose flag for debug output
 * - Automatic "DRY-RUN:" prefixing in dry-run mode
 * - Type-safe log levels with consistent formatting
 * - Zero external dependencies (uses native console)
 */

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
 * Console-based logger implementation with execution context integration.
 */
class ConsoleLogger implements Logger {
  constructor(private readonly context: ExecutionContext) {}

  debug(message: string, ...args: unknown[]): void {
    if (!this.context.verbose) return;
    const prefixed = this.addPrefixes("🔍", message);
    console.debug(prefixed, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    const prefixed = this.addPrefixes("ℹ️", message);
    console.info(prefixed, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    const prefixed = this.addPrefixes("⚠️", message);
    console.warn(prefixed, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    const prefixed = this.addPrefixes("❌", message);
    console.error(prefixed, ...args);
  }

  /**
   * Applies dry-run and level prefixes to the message.
   *
   * @param levelIcon Emoji icon for the log level.
   * @param message Original message to prefix.
   * @returns Prefixed message string.
   */
  private addPrefixes(levelIcon: string, message: string): string {
    const parts = [levelIcon];

    if (this.context.dryRun) {
      parts.push("DRY-RUN:");
    }

    parts.push(message);
    return parts.join(" ");
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
  return new ConsoleLogger(context);
}
