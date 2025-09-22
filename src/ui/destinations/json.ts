/**
 * @fileoverview JSON destination for CI and non-interactive environments.
 *
 * Outputs structured JSON logs suitable for parsing by CI systems
 * and other automated tools. No fancy UI elements, just clean JSON.
 */

import type { LogLevel, Task } from "#ui/types";
import {
  BaseLogDestination,
  type SpinnerHandle,
  type TaskHandle,
} from "./base.js";

/**
 * JSON log entry structure.
 */
interface JSONLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  type: "log" | "spinner_start" | "spinner_end" | "task_start" | "task_end" | "note";
  status?: "success" | "error";
  title?: string;
}

/**
 * JSON-specific spinner handle.
 */
class JSONSpinnerHandle implements SpinnerHandle {
  constructor(
    private readonly destination: JSONDestination,
    private readonly message: string,
  ) {}

  success(message?: string): void {
    this.destination.outputJSON({
      timestamp: new Date().toISOString(),
      level: "info",
      message: message ?? `${this.message} completed`,
      type: "spinner_end",
      status: "success",
    });
    this.destination.onSpinnerStopped();
  }

  error(message?: string): void {
    this.destination.outputJSON({
      timestamp: new Date().toISOString(),
      level: "error",
      message: message ?? `${this.message} failed`,
      type: "spinner_end",
      status: "error",
    });
    this.destination.onSpinnerStopped();
  }

  update(message: string): void {
    this.destination.outputJSON({
      timestamp: new Date().toISOString(),
      level: "info",
      message,
      type: "log",
    });
  }
}

/**
 * JSON-specific tasks handle.
 */
class JSONTaskHandle implements TaskHandle {
  constructor(private readonly destination: JSONDestination) {}

  complete(): void {
    this.destination.outputJSON({
      timestamp: new Date().toISOString(),
      level: "info",
      message: "All tasks completed",
      type: "task_end",
      status: "success",
    });
    this.destination.onTasksStopped();
  }

  error(message?: string): void {
    this.destination.outputJSON({
      timestamp: new Date().toISOString(),
      level: "error",
      message: message ?? "Tasks failed",
      type: "task_end",
      status: "error",
    });
    this.destination.onTasksStopped();
  }
}

/**
 * JSON destination for structured logging in CI environments.
 *
 * Outputs clean JSON logs without any terminal UI elements.
 * Each log entry includes timestamp, level, and structured metadata.
 */
export class JSONDestination extends BaseLogDestination {
  protected writeOutput(level: LogLevel, message: string): void {
    this.outputJSON({
      timestamp: new Date().toISOString(),
      level,
      message,
      type: "log",
    });
  }

  protected createSpinner(message: string): SpinnerHandle {
    this.outputJSON({
      timestamp: new Date().toISOString(),
      level: "info",
      message,
      type: "spinner_start",
    });

    return new JSONSpinnerHandle(this, message);
  }

  protected createTasks(tasks: Task[]): TaskHandle {
    this.outputJSON({
      timestamp: new Date().toISOString(),
      level: "info",
      message: `Starting ${tasks.length} tasks`,
      type: "task_start",
    });

    // Execute tasks in sequence
    this.executeTasks(tasks);

    return new JSONTaskHandle(this);
  }

  protected showNoteOutput(content: string, title?: string): void {
    this.outputJSON({
      timestamp: new Date().toISOString(),
      level: "info",
      message: content,
      type: "note",
      ...(title && { title }),
    });
  }

  /**
   * Output JSON entry to stdout.
   */
  outputJSON(entry: JSONLogEntry): void {
    console.log(JSON.stringify(entry));
  }

  /**
   * Called when spinner handle completes.
   */
  onSpinnerStopped(): void {
    this.activeElement = "none";
    this.flushBuffer();
  }

  /**
   * Called when tasks handle completes.
   */
  onTasksStopped(): void {
    this.activeElement = "none";
    this.flushBuffer();
  }

  /**
   * Execute tasks sequentially and output progress.
   */
  private async executeTasks(tasks: Task[]): Promise<void> {
    for (const task of tasks) {
      this.outputJSON({
        timestamp: new Date().toISOString(),
        level: "info",
        message: task.title,
        type: "log",
      });

      try {
        const messageCallback = (msg: string): void => {
          this.outputJSON({
            timestamp: new Date().toISOString(),
            level: "info",
            message: msg,
            type: "log",
          });
        };

        await task.task(messageCallback);

        this.outputJSON({
          timestamp: new Date().toISOString(),
          level: "info",
          message: `${task.title} completed`,
          type: "log",
        });
      } catch (error) {
        this.outputJSON({
          timestamp: new Date().toISOString(),
          level: "error",
          message: `${task.title} failed: ${error instanceof Error ? error.message : String(error)}`,
          type: "log",
        });
      }
    }

    this.onTasksStopped();
  }
}