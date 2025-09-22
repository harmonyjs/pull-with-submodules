/**
 * @fileoverview TUI State Manager facade for coordinated terminal UI operations.
 *
 * Provides a unified interface for logging, spinners, and tasks by coordinating
 * between BufferedLogger and TUICoordinator components. Manages component
 * lifecycle based on execution context changes without exposing singleton
 * implementation details.
 */

import type { ExecutionContext } from "#types/core";
import { TUIContextRegistry } from "./tui-context-registry.js";
import type {
  LogImplementation,
  Task,
  Logger,
  IBufferedLogger,
  UIOperations,
} from "./types.js";

// Global registry instance
const registry = new TUIContextRegistry();

/**
 * TUI State Manager facade that coordinates logging and UI operations.
 *
 * Acts as a unified interface over BufferedLogger and TUICoordinator,
 * providing seamless integration between logging and UI coordination
 * while maintaining clean separation of concerns.
 */
export class TUIStateManager implements Logger {
  /**
   * Creates a TUI state manager facade.
   *
   * @param logger Buffered logger instance for log operations
   * @param coordinator TUI coordinator for spinner/task operations
   */
  constructor(
    private readonly logger: IBufferedLogger,
    private readonly coordinator: UIOperations,
  ) {}

  /**
   * Logs debug-level information (only when verbose = true).
   *
   * @param message Primary message to log
   * @param args Additional arguments for string interpolation
   */
  debug(message: string, ...args: unknown[]): void {
    this.logger.debug(message, ...args);
  }

  /**
   * Logs verbose information with grey styling (only when verbose = true).
   *
   * @param message Primary message to log
   * @param args Additional arguments for string interpolation
   */
  verbose(message: string, ...args: unknown[]): void {
    this.logger.verbose(message, ...args);
  }

  /**
   * Logs informational messages (always shown).
   *
   * @param message Primary message to log
   * @param args Additional arguments for string interpolation
   */
  info(message: string, ...args: unknown[]): void {
    this.logger.info(message, ...args);
  }

  /**
   * Logs warning messages (always shown with yellow prefix).
   *
   * @param message Primary message to log
   * @param args Additional arguments for string interpolation
   */
  warn(message: string, ...args: unknown[]): void {
    this.logger.warn(message, ...args);
  }

  /**
   * Logs error messages (always shown with red prefix).
   *
   * @param message Primary message to log
   * @param args Additional arguments for string interpolation
   */
  error(message: string, ...args: unknown[]): void {
    this.logger.error(message, ...args);
  }

  /**
   * Executes an operation with a spinner, coordinating output.
   *
   * @param message Message to display in spinner
   * @param operation Async operation to execute
   * @returns Promise resolving to operation result
   */
  async withSpinner<T>(
    message: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    return this.coordinator.withSpinner(message, operation);
  }

  /**
   * Executes multiple tasks with coordinated output.
   *
   * @param tasks Array of tasks to execute
   * @returns Promise that resolves when all tasks complete
   */
  async withTasks(tasks: Task[]): Promise<void> {
    return this.coordinator.withTasks(tasks);
  }

  /**
   * Gets a TUI state manager instance for the given execution context.
   *
   * Manages component lifecycle automatically based on context changes
   * without exposing singleton implementation details to external code.
   *
   * @param context Execution context containing verbose and other flags
   * @param logImpl Optional log implementation for testing
   * @returns TUI state manager instance bound to the context
   */
  static getInstance(
    context: ExecutionContext,
    logImpl?: LogImplementation,
  ): TUIStateManager {
    const components = registry.getComponents(context, logImpl);

    if (components.facade === null || components.facade === undefined) {
      const facade = new TUIStateManager(
        components.logger,
        components.coordinator,
      );
      registry.setFacade(context, facade);
      return facade;
    }

    return components.facade as TUIStateManager;
  }

  /**
   * Clears all managed components (for testing purposes).
   *
   * @internal This method is intended for test cleanup only
   */
  static clearRegistry(): void {
    TUIContextRegistry.clear();
  }
}
