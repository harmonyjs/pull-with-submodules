/**
 * @fileoverview Buffered logger implementation for coordinated UI output.
 *
 * Provides logging functionality with intelligent buffering to prevent
 * output conflicts when spinners or tasks are active. Implements the
 * Logger interface while maintaining clean separation from UI coordination.
 */

import type { ExecutionContext } from "#types/core";
import { symbols, status } from "./colors.js";
import { formatLogArgs } from "./formatting-utils.js";
import type {
  LogImplementation,
  ExtendedLogImplementation,
  LogLevel,
  BufferedLogEntry,
  IBufferedLogger,
} from "./types.js";

/**
 * Type guard to check if log implementation has extended message method.
 * Uses safer property checking without casting to any.
 *
 * @param logImpl Log implementation to check
 * @returns True if implementation supports styled messages with symbols
 */
function hasMessageMethod(
  logImpl: LogImplementation,
): logImpl is ExtendedLogImplementation {
  return (
    "message" in logImpl &&
    typeof Reflect.get(logImpl, "message") === "function"
  );
}

/**
 * Logger implementation with intelligent buffering capabilities.
 *
 * Buffers log messages when UI operations (spinners/tasks) are active
 * to prevent output conflicts and ensure clean terminal presentation.
 * Flushes buffered messages when coordination allows.
 *
 * Buffer overflow protection: Maintains a maximum of 1000 entries using
 * FIFO eviction to prevent unbounded memory growth during long operations.
 *
 * This class only handles logging operations and delegates UI operations
 * (spinners, tasks) to the TUICoordinator component.
 */
export class BufferedLogger implements IBufferedLogger {
  /** Maximum number of log entries to buffer before evicting oldest entries */
  private static readonly MAX_BUFFER_SIZE = 1000;

  private readonly bufferedLogs: BufferedLogEntry[] = [];
  private isBuffering = false;

  /**
   * Creates a buffered logger instance.
   *
   * @param context Execution context containing verbose and other flags
   * @param logImpl Log implementation for actual output (defaults to @clack/prompts log)
   */
  constructor(
    private readonly context: ExecutionContext,
    private readonly logImpl: LogImplementation,
  ) {}

  /**
   * Logs debug-level information (only when verbose = true).
   *
   * @param message Primary message to log
   * @param args Additional arguments for string interpolation
   */
  debug(message: string, ...args: unknown[]): void {
    if (!this.context.verbose) return;

    const formattedMessage =
      args.length > 0 ? `${message} ${formatLogArgs(args)}` : message;

    if (this.isBuffering) {
      this.bufferLog("debug", formattedMessage);
    } else {
      this.logImpl.step(formattedMessage);
    }
  }

  /**
   * Logs verbose information with grey styling (only when verbose = true).
   *
   * @param message Primary message to log
   * @param args Additional arguments for string interpolation
   */
  verbose(message: string, ...args: unknown[]): void {
    if (!this.context.verbose) return;

    const formattedMessage =
      args.length > 0 ? `${message} ${formatLogArgs(args)}` : message;

    if (this.isBuffering) {
      this.bufferLog("verbose", formattedMessage);
    } else {
      const styledMessage = status.verbose(formattedMessage);
      // Use the extended log implementation for styled messages if available
      if (hasMessageMethod(this.logImpl)) {
        this.logImpl.message(styledMessage, symbols.verbose);
      } else {
        this.logImpl.info(styledMessage);
      }
    }
  }

  /**
   * Logs informational messages (always shown).
   *
   * @param message Primary message to log
   * @param args Additional arguments for string interpolation
   */
  info(message: string, ...args: unknown[]): void {
    const formattedMessage =
      args.length > 0 ? `${message} ${formatLogArgs(args)}` : message;

    if (this.isBuffering) {
      this.bufferLog("info", formattedMessage);
    } else {
      this.logImpl.info(formattedMessage);
    }
  }

  /**
   * Logs warning messages (always shown with yellow prefix).
   *
   * @param message Primary message to log
   * @param args Additional arguments for string interpolation
   */
  warn(message: string, ...args: unknown[]): void {
    const formattedMessage =
      args.length > 0 ? `${message} ${formatLogArgs(args)}` : message;

    if (this.isBuffering) {
      this.bufferLog("warn", formattedMessage);
    } else {
      this.logImpl.warn(formattedMessage);
    }
  }

  /**
   * Logs error messages (always shown with red prefix).
   *
   * @param message Primary message to log
   * @param args Additional arguments for string interpolation
   */
  error(message: string, ...args: unknown[]): void {
    const formattedMessage =
      args.length > 0 ? `${message} ${formatLogArgs(args)}` : message;

    if (this.isBuffering) {
      this.bufferLog("error", formattedMessage);
    } else {
      this.logImpl.error(formattedMessage);
    }
  }

  /**
   * Enables buffering mode to prevent output conflicts.
   * Called by TUICoordinator when spinners/tasks are active.
   */
  startBuffering(): void {
    this.isBuffering = true;
  }

  /**
   * Disables buffering mode and flushes accumulated messages.
   * Called by TUICoordinator when spinners/tasks complete.
   */
  stopBuffering(): void {
    this.isBuffering = false;
    this.flushBuffer();
  }

  /**
   * Adds a log entry to the buffer with metadata.
   *
   * Implements FIFO eviction when buffer exceeds MAX_BUFFER_SIZE
   * to prevent unbounded memory growth.
   *
   * @param level Log level for the message
   * @param message Formatted message to buffer
   */
  private bufferLog(level: LogLevel, message: string): void {
    // Apply FIFO eviction if buffer is at capacity
    if (this.bufferedLogs.length >= BufferedLogger.MAX_BUFFER_SIZE) {
      this.bufferedLogs.shift(); // Remove oldest entry
    }

    this.bufferedLogs.push({
      level,
      message,
      timestamp: Date.now(),
    });
  }

  /**
   * Outputs all buffered log entries through the appropriate log methods.
   * Respects verbose flag and log level semantics during flush.
   */
  private flushBuffer(): void {
    for (const entry of this.bufferedLogs) {
      switch (entry.level) {
        case "debug":
          if (this.context.verbose) {
            this.logImpl.step(entry.message);
          }
          break;
        case "verbose":
          if (this.context.verbose) {
            const styledMessage = status.verbose(entry.message);
            this.logImpl.info(styledMessage);
          }
          break;
        case "info":
          this.logImpl.info(entry.message);
          break;
        case "warn":
          this.logImpl.warn(entry.message);
          break;
        case "error":
          this.logImpl.error(entry.message);
          break;
      }
    }
    this.bufferedLogs.length = 0;
  }
}
