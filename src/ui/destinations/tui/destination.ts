/**
 * @fileoverview TUI destination that provides terminal output using @clack/prompts logging.
 *
 * This class enforces the "One Active Element" and "Auto-stop on Write" rules:
 * - Only one operation (spinner or tasks) can be active at any time
 * - Any write() call stops active UI elements
 * - Buffers log messages during operations
 * - Flushes buffer when operations complete
 */

import { log, note } from "@clack/prompts";
import pc from "picocolors";
import type { LogLevel, Task } from "#ui/types";
import { symbols } from "#ui/colors";
import {
  BaseLogDestination,
  type SpinnerHandle,
  type TaskHandle,
} from "#ui/destinations/base";
import { TUISpinnerHandle } from "./spinner-handle.js";
import { TUITaskHandle } from "./task-handle.js";

/**
 * TUI destination that provides terminal output using @clack/prompts logging.
 *
 * This class enforces the "One Active Element" and "Auto-stop on Write" rules:
 * - Only one operation (spinner or tasks) can be active at any time
 * - Any write() call stops active UI elements to prevent conflicts
 * - Buffers log messages during operations
 * - Flushes buffer when operations complete
 *
 * Uses simple log messages instead of animated UI elements for better reliability.
 *
 * @example
 * ```typescript
 * const destination = new TUIDestination();
 * const spinner = destination.startSpinner("Loading...");
 * spinner.success("Completed!");
 * ```
 */
export class TUIDestination extends BaseLogDestination {
  private activeSpinnerHandle: TUISpinnerHandle | null = null;
  private activeTasksHandle: TUITaskHandle | null = null;

  // eslint-disable-next-line class-methods-use-this -- Abstract method implementation
  protected writeOutput(level: LogLevel, message: string): void {
    switch (level) {
      case "step":
        log.step(message);
        break;
      case "info":
        log.info(message);
        break;
      case "warn":
        log.warn(message);
        break;
      case "error":
        log.error(message);
        break;
      case "verbose":
        // Verbose uses special symbol from colors
        log.message(pc.gray(message), { symbol: symbols.verbose });
        break;
      case "debug":
        // Debug treated same as verbose for now
        log.message(pc.gray(message), { symbol: symbols.verbose });
        break;
      default:
        log.info(message);
    }
  }

  protected createSpinner(message: string): SpinnerHandle {
    const handle = new TUISpinnerHandle(this, message);

    this.activeSpinnerHandle = handle;

    return handle;
  }

  protected createTasks(taskList: Task[]): TaskHandle {
    // Create a promise that we can resolve after creating the handle
    let resolveTasksPromise: () => void;
    let rejectTasksPromise: (error: unknown) => void;
    const tasksPromise = new Promise<void>((resolve, reject) => {
      resolveTasksPromise = resolve;
      rejectTasksPromise = reject;
    });

    // Create handle first before starting task execution
    const handle = new TUITaskHandle(this, tasksPromise, taskList.length);
    this.activeTasksHandle = handle;

    // Execute tasks sequentially with simple logging, passing the handle
    this.executeTasks(taskList, handle)
      .then(() => resolveTasksPromise())
      .catch((error: unknown) => rejectTasksPromise(error));

    return handle;
  }

  // eslint-disable-next-line class-methods-use-this -- Abstract method implementation
  protected showNoteOutput(content: string, title?: string): void {
    note(content, title);
  }

  /**
   * Override base stopActiveElement to handle TUI-specific cleanup.
   */
  protected override stopActiveElement(): void {
    if (this.activeSpinnerHandle) {
      // Gracefully interrupt the spinner (not success, not failure)
      this.activeSpinnerHandle.interrupt();
      this.activeSpinnerHandle = null;
    }

    if (this.activeTasksHandle) {
      // Tasks will stop naturally, just clear our reference
      this.activeTasksHandle = null;
    }

    super.stopActiveElement();
  }

  /**
   * Override write to buffer messages during UI operations.
   */
  override write(level: LogLevel, message: string): void {
    // If we have an active UI element, buffer the message
    if (this.activeElement === "spinner" || this.activeElement === "tasks") {
      this.bufferMessage(level, message);
      // Auto-stop the active element
      this.stopActiveElement();
    } else {
      // No active UI, write directly
      this.writeOutput(level, message);
    }
  }

  /**
   * Check if a spinner handle is the currently active one.
   */
  isActiveSpinner(handle: TUISpinnerHandle): boolean {
    return this.activeSpinnerHandle === handle;
  }

  /**
   * Called when a spinner stops naturally (success/error called on handle).
   * Part of the handle callback interface.
   */
  onSpinnerStopped(): void {
    this.activeSpinnerHandle = null;
    this.activeElement = "none";
    this.flushBuffer();
  }

  /**
   * Called when tasks stop naturally.
   * Part of the handle callback interface.
   */
  onTasksStopped(): void {
    this.activeTasksHandle = null;
    this.activeElement = "none";
    this.flushBuffer();
  }

  /**
   * Public method for handles to write output.
   * Delegates to protected writeOutput method.
   */
  writeLog(level: LogLevel, message: string): void {
    this.writeOutput(level, message);
  }

  /**
   * Execute tasks sequentially with progress logging.
   */
  private async executeTasks(
    taskList: Task[],
    handle: TUITaskHandle,
  ): Promise<void> {
    for (const task of taskList) {
      try {
        let lastMessage: string | undefined;
        const messageCallback = (msg: string): void => {
          lastMessage = msg;
          // Show progress updates
          this.writeLog("info", `  ${msg}`);
        };

        const result = await task.task(messageCallback);

        // Determine success message
        let successMessage = task.title;
        if (lastMessage !== undefined && lastMessage !== "") {
          successMessage = lastMessage;
        } else if (typeof result === "string" && result !== "") {
          successMessage = result;
        }

        // Notify handle of successful completion
        if (
          handle !== null &&
          typeof handle.notifyTaskCompleted === "function"
        ) {
          handle.notifyTaskCompleted(successMessage);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Notify handle of failure
        if (handle !== null && typeof handle.notifyTaskFailed === "function") {
          handle.notifyTaskFailed(task.title, errorMessage);
        }

        throw error; // Re-throw to fail the entire operation
      }
    }

    // Tasks completed successfully
    this.onTasksStopped();
  }
}
