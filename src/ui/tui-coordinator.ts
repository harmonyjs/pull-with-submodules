/**
 * @fileoverview TUI coordination for spinners and tasks.
 *
 * Manages spinner and task execution with proper state coordination
 * to prevent output conflicts. Handles both interactive and non-interactive
 * modes with appropriate fallbacks.
 */

import { symbols } from "./colors.js";
import { isInteractiveEnvironment } from "./tty.js";
import {
  executeSpinnerNonInteractive,
  executeTasksNonInteractive,
} from "./non-interactive-helpers.js";
import { ClackUIAdapter } from "./clack-ui-adapter.js";
import { clackLogAdapter } from "./clack-log-adapter.js";
import type { Task, UIOperations, IBufferedLogger } from "./types.js";

/**
 * TUI coordinator state for tracking active operations.
 */
interface TUICoordinatorState {
  /** Currently active spinner instance and message */
  activeSpinner: { message: string; instance: unknown } | null;
  /** Whether tasks are currently executing */
  activeTasks: boolean;
}

/**
 * Coordinates TUI operations (spinners, tasks) with logger buffering.
 *
 * Manages the interaction between spinners/tasks and logger output
 * to ensure clean terminal presentation without conflicts or
 * interrupted output streams.
 */
export class TUICoordinator implements UIOperations {
  private readonly state: TUICoordinatorState = {
    activeSpinner: null,
    activeTasks: false,
  };

  /**
   * Creates a TUI coordinator instance.
   *
   * @param logger Buffered logger instance for coordinated output
   */
  constructor(private readonly logger: IBufferedLogger) {}

  /**
   * Executes an operation with a spinner, coordinating with logger buffering.
   *
   * @param message Message to display in spinner
   * @param operation Async operation to execute
   * @returns Promise resolving to operation result
   */
  async withSpinner<T>(
    message: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (!isInteractiveEnvironment()) {
      return executeSpinnerNonInteractive(message, operation, clackLogAdapter);
    }

    if (this.isUIBusy()) {
      return this.executeWithBuffering(message, operation);
    }

    return this.executeWithSpinner(message, operation);
  }

  /**
   * Executes multiple tasks with coordinated output.
   *
   * @param tasks Array of tasks to execute
   * @returns Promise that resolves when all tasks complete
   */
  async withTasks(tasks: Task[]): Promise<void> {
    if (!isInteractiveEnvironment()) {
      return executeTasksNonInteractive(tasks, clackLogAdapter);
    }

    if (this.isUIBusy()) {
      return this.executeTasksWithBuffering(tasks);
    }

    return this.executeWithTasksUI(tasks);
  }

  /**
   * Checks if UI is currently busy with spinners or tasks.
   *
   * @returns True if spinner or tasks are active
   */
  private isUIBusy(): boolean {
    return this.state.activeSpinner !== null || this.state.activeTasks;
  }

  /**
   * Executes operation with buffering when UI is busy.
   *
   * @param message Operation description for logging
   * @param operation Async operation to execute
   * @returns Promise resolving to operation result
   */
  private async executeWithBuffering<T>(
    message: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    this.logger.info(`${symbols.process} ${message}`);
    const result = await operation();
    this.logger.info(`${symbols.success} ${message} completed`);
    return result;
  }

  /**
   * Executes operation with actual spinner UI.
   *
   * @param message Spinner message
   * @param operation Async operation to execute
   * @returns Promise resolving to operation result
   */
  private async executeWithSpinner<T>(
    message: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    this.logger.startBuffering();
    const s = ClackUIAdapter.createSpinner();
    this.state.activeSpinner = { message, instance: s };

    try {
      s.start(message);
      const result = await operation();
      s.stop(`${message} completed`);

      this.logger.stopBuffering();
      return result;
    } catch (error) {
      s.stop(`${message} failed`);
      this.logger.stopBuffering();
      throw error;
    } finally {
      this.state.activeSpinner = null;
    }
  }

  /**
   * Executes tasks with buffering when UI is busy.
   *
   * @param tasks Array of tasks to execute
   * @returns Promise that resolves when all tasks complete
   */
  private async executeTasksWithBuffering(tasks: Task[]): Promise<void> {
    for (const task of tasks) {
      this.logger.info(`${symbols.process} ${task.title}`);
      await task.task();
      this.logger.info(`${symbols.success} ${task.title} completed`);
    }
  }

  /**
   * Executes tasks with actual tasks UI.
   *
   * @param tasks Array of tasks to execute
   * @returns Promise that resolves when all tasks complete
   */
  private async executeWithTasksUI(tasks: Task[]): Promise<void> {
    this.logger.startBuffering();
    this.state.activeTasks = true;

    try {
      const clackTasks = ClackUIAdapter.convertTasks(tasks);
      await ClackUIAdapter.executeTasks(clackTasks);
    } finally {
      this.state.activeTasks = false;
      this.logger.stopBuffering();
    }
  }
}
