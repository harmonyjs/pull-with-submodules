/**
 * @fileoverview JSON destination for structured logging in CI environments.
 *
 * Outputs clean JSON logs without any terminal UI elements.
 * Each log entry includes timestamp, level, and structured metadata.
 */

import type { LogLevel, Task } from "#ui/types";
import {
  BaseLogDestination,
  type SpinnerHandle,
  type TaskHandle,
} from "#ui/destinations/base";
import type { JSONLogEntry } from "./types.js";
import { JSONSpinnerHandle } from "./spinner-handle.js";
import { JSONTaskHandle } from "./task-handle.js";

/**
 * JSON destination for structured logging in CI environments.
 *
 * Outputs clean JSON logs without any terminal UI elements.
 * Each log entry includes timestamp, level, and structured metadata.
 *
 * @example
 * ```typescript
 * const destination = new JSONDestination();
 * destination.info("Processing started");
 * // Output: {"timestamp":"2024-01-01T00:00:00.000Z","level":"info","message":"Processing started","type":"log"}
 * ```
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

    // Execute tasks in sequence (fire and forget for JSON output)
    this.executeTasks(tasks).catch((error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.writeOutput("error", `Tasks failed: ${errorMessage}`);
    });

    return new JSONTaskHandle(this);
  }

  protected showNoteOutput(content: string, title?: string): void {
    const entry: JSONLogEntry = {
      timestamp: new Date().toISOString(),
      level: "info",
      message: content,
      type: "note",
    };

    if (title !== undefined && title !== "") {
      entry.title = title;
    }

    this.outputJSON(entry);
  }

  /**
   * Output JSON entry to stdout.
   * Used internally by handle classes to maintain JSON output format.
   */
  // eslint-disable-next-line class-methods-use-this -- Method belongs to instance for interface consistency
  outputJSON(entry: JSONLogEntry): void {
    console.log(JSON.stringify(entry));
  }

  /**
   * Called when spinner handle completes.
   * Part of the handle callback interface.
   */
  onSpinnerStopped(): void {
    this.activeElement = "none";
    this.flushBuffer();
  }

  /**
   * Called when tasks handle completes.
   * Part of the handle callback interface.
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
