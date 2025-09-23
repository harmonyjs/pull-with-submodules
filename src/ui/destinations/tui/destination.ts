/**
 * @fileoverview TUI destination that provides beautiful terminal output using @clack/prompts.
 *
 * This class enforces the "One Active Element" and "Auto-stop on Write" rules:
 * - Only one spinner or tasks can be active at any time
 * - Any write() call stops active UI elements
 * - Buffers log messages during spinner/tasks operations
 * - Flushes buffer when UI elements stop
 */

import { log, spinner, tasks, note } from "@clack/prompts";
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
 * TUI destination that provides beautiful terminal output using @clack/prompts.
 *
 * This class enforces the "One Active Element" and "Auto-stop on Write" rules:
 * - Only one spinner or tasks can be active at any time
 * - Any write() call stops active UI elements to prevent conflicts
 * - Buffers log messages during spinner/tasks operations
 * - Flushes buffer when UI elements stop
 *
 * This is the ONLY place in the codebase that should import @clack/prompts.
 *
 * @example
 * ```typescript
 * const destination = new TUIDestination();
 * const spinner = destination.spinner("Loading...");
 * spinner.success("Completed!");
 * ```
 */
export class TUIDestination extends BaseLogDestination {
  private activeSpinnerHandle: TUISpinnerHandle | null = null;
  private activeTasksHandle: TUITaskHandle | null = null;

  // eslint-disable-next-line class-methods-use-this -- Abstract method implementation
  protected writeOutput(level: LogLevel, message: string): void {
    switch (level) {
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
    const spinnerInstance = spinner();
    const handle = new TUISpinnerHandle(spinnerInstance, this, message);

    this.activeSpinnerHandle = handle;
    spinnerInstance.start(message);

    return handle;
  }

  protected createTasks(taskList: Task[]): TaskHandle {
    // Convert internal Task format to @clack/prompts format
    const clackTasks = taskList.map((task) => ({
      title: task.title,
      task: async (): Promise<string> => {
        let message: string | undefined;
        const messageCallback = (msg: string): void => {
          message = msg;
        };

        const result = await task.task(messageCallback);

        // Return the last message or the result if it's a string
        if (message !== undefined && message !== "") return message;
        if (typeof result === "string") return result;
        return "";
      },
    }));

    // Execute tasks and create handle
    void tasks(clackTasks)
      .then(() => {
        this.onTasksStopped();
      })
      .catch((error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.writeOutput("error", `Tasks failed: ${errorMessage}`);
        this.onTasksStopped();
      });

    const handle = new TUITaskHandle(this);
    this.activeTasksHandle = handle;

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
}
