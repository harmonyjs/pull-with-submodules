/**
 * @fileoverview TUI destination for interactive terminal output.
 *
 * Encapsulates all @clack/prompts usage and implements auto-stop rules
 * to prevent spinner residue and UI conflicts. This is the ONLY place
 * in the codebase that should import @clack/prompts.
 */

import {
  log,
  spinner,
  tasks,
  note,
} from "@clack/prompts";
import pc from "picocolors";
import type { LogLevel, Task } from "#ui/types";
import { symbols } from "#ui/colors";
import {
  BaseLogDestination,
  type SpinnerHandle,
  type TaskHandle,
} from "./base.js";

/**
 * TUI-specific spinner implementation with auto-stop functionality.
 */
class TUISpinnerHandle implements SpinnerHandle {
  constructor(
    private readonly spinnerInstance: any,
    private readonly destination: TUIDestination,
    private readonly initialMessage: string,
  ) {}

  success(message?: string): void {
    if (this.destination.isActiveSpinner(this)) {
      const successMessage = message ?? `${this.initialMessage} completed`;
      this.spinnerInstance.stop(successMessage);
      this.destination.onSpinnerStopped();
    }
  }

  error(message?: string): void {
    if (this.destination.isActiveSpinner(this)) {
      const errorMessage = message ?? `${this.initialMessage} failed`;
      this.spinnerInstance.stop(errorMessage);
      this.destination.onSpinnerStopped();
    }
  }

  update(message: string): void {
    if (this.destination.isActiveSpinner(this)) {
      this.spinnerInstance.message(message);
    }
  }
}

/**
 * TUI-specific tasks implementation.
 */
class TUITaskHandle implements TaskHandle {
  constructor(
    private readonly destination: TUIDestination,
    _taskPromise: Promise<void>,
  ) {}

  complete(): void {
    // Tasks complete automatically when the promise resolves
    // This is just for interface compliance
  }

  error(message?: string): void {
    if (message) {
      this.destination.write("error", message);
    }
    this.destination.onTasksStopped();
  }
}

/**
 * TUI destination that provides beautiful terminal output using @clack/prompts.
 *
 * This class enforces the "One Active Element" and "Auto-stop on Write" rules:
 * - Only one spinner or tasks can be active at any time
 * - Any write() call stops active UI elements
 * - Buffers log messages during spinner/tasks operations
 * - Flushes buffer when UI elements stop
 */
export class TUIDestination extends BaseLogDestination {
  private activeSpinnerHandle: TUISpinnerHandle | null = null;
  private activeTasksHandle: TUITaskHandle | null = null;

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
        if (message) return message;
        if (typeof result === "string") return result;
        return "";
      },
    }));

    // Execute tasks and create handle
    const taskPromise = tasks(clackTasks).then(() => {
      this.onTasksStopped();
    }).catch((error: any) => {
      this.writeOutput("error", `Tasks failed: ${error.message}`);
      this.onTasksStopped();
    });

    const handle = new TUITaskHandle(this, taskPromise);
    this.activeTasksHandle = handle;

    return handle;
  }

  protected showNoteOutput(content: string, title?: string): void {
    note(content, title);
  }

  /**
   * Override base stopActiveElement to handle TUI-specific cleanup.
   */
  protected override stopActiveElement(): void {
    if (this.activeSpinnerHandle) {
      // Force stop the spinner without message
      this.activeSpinnerHandle.error();
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
   */
  onSpinnerStopped(): void {
    this.activeSpinnerHandle = null;
    this.activeElement = "none";
    this.flushBuffer();
  }

  /**
   * Called when tasks stop naturally.
   */
  onTasksStopped(): void {
    this.activeTasksHandle = null;
    this.activeElement = "none";
    this.flushBuffer();
  }
}