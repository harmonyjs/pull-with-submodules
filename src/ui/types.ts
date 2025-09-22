/**
 * @fileoverview Shared types for UI components.
 *
 * Contains type definitions used across the UI layer including
 * logger interfaces, task definitions, and log levels.
 */

/**
 * Interface for log implementation (for testing).
 */
export interface LogImplementation {
  step(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/**
 * Extended log implementation with additional message method.
 * Used by adapters that support styled messages with symbols.
 */
export interface ExtendedLogImplementation extends LogImplementation {
  message(msg: string, symbol: string): void;
}

/**
 * Log level enumeration for type safety and filtering.
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "verbose";

/**
 * Task definition for sequential execution.
 */
export interface Task {
  title: string;
  task: (
    message?: (msg: string) => void,
  ) => string | Promise<string> | void | Promise<void>;
}

/**
 * Base logger interface for core logging operations.
 *
 * Contains only logging methods without UI operations like spinners or tasks.
 * This interface follows the Interface Segregation Principle (ISP) by providing
 * only the essential logging functionality.
 *
 * @example
 * ```typescript
 * class SimpleLogger implements BaseLogger {
 *   info(message: string) { console.log(message); }
 *   warn(message: string) { console.warn(message); }
 *   // ... other methods
 * }
 * ```
 */
export interface BaseLogger {
  debug(message: string, ...args: unknown[]): void;
  verbose(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * UI operations interface for spinner and task management.
 *
 * Separated from logging to follow the Single Responsibility Principle (SRP).
 * Components that only need logging can depend on BaseLogger, while components
 * that need UI coordination can depend on this interface.
 *
 * @example
 * ```typescript
 * const result = await uiOps.withSpinner("Processing...", async () => {
 *   // Long-running operation
 *   return await processData();
 * });
 * ```
 */
export interface UIOperations {
  withSpinner<T>(message: string, operation: () => Promise<T>): Promise<T>;
  withTasks(tasks: Task[]): Promise<void>;
}

/**
 * Full logger interface combining logging and UI operations.
 *
 * This interface combines BaseLogger and UIOperations for components that need
 * both capabilities. Most application code should depend on this interface.
 */
export interface Logger extends BaseLogger, UIOperations {}

/**
 * Buffered log entry for deferred output during UI operations.
 *
 * When spinners or tasks are active, log messages are buffered to prevent
 * output conflicts. Each entry contains the log level, formatted message,
 * and timestamp for proper ordering during flush operations.
 *
 * @example
 * ```typescript
 * const entry: BufferedLogEntry = {
 *   level: "info",
 *   message: "Operation completed successfully",
 *   timestamp: Date.now()
 * };
 * ```
 */
export interface BufferedLogEntry {
  /** Log level for filtering and formatting */
  level: LogLevel;
  /** Pre-formatted message ready for output */
  message: string;
  /** Timestamp when the log entry was created */
  timestamp: number;
}

// TUIState interface removed - state is now managed internally by BufferedLogger and TUICoordinator

/**
 * Interface for buffered logger functionality.
 *
 * Abstracts the BufferedLogger implementation to enable better testing
 * and potential alternative implementations.
 */
export interface IBufferedLogger extends BaseLogger {
  /** Enables buffering mode to prevent output conflicts */
  startBuffering(): void;
  /** Disables buffering mode and flushes accumulated messages */
  stopBuffering(): void;
}

// Interfaces are exported directly via 'export interface' declarations above
