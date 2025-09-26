/**
 * @fileoverview TUI-specific tasks implementation using simple log messages.
 */

import type { TaskHandle } from "#ui/destinations/base";
import type { TUIDestination } from "./destination.js";

/**
 * TUI-specific tasks implementation using simple log messages instead of @clack tasks.
 *
 * This implementation shows:
 * - Start: "Starting {count} tasks..."
 * - Progress: Individual task completion messages
 * - Complete: "Tasks completed: {completed}/{total}"
 */
export class TUITaskHandle implements TaskHandle {
  private completed = 0;
  private failed = 0;
  private isCompleted = false;

  constructor(
    private readonly destination: TUIDestination,
    private readonly tasksPromise: Promise<void>,
    private readonly totalTasks: number,
  ) {
    // Show initial message immediately using step symbol (◇)
    this.destination.writeLog(
      "step",
      `Starting ${totalTasks} ${totalTasks === 1 ? "task" : "tasks"}...`,
    );
  }

  complete(): void {
    if (!this.isCompleted) {
      this.isCompleted = true;
      const summary = this.buildSummary();
      this.destination.writeLog("info", summary);
      this.destination.onTasksStopped();
    }
  }

  error(message?: string): void {
    if (!this.isCompleted) {
      this.failed++;
      if (message !== null && message !== "" && message !== undefined) {
        this.destination.writeLog("error", `Task failed: ${message}`);
      }
      this.isCompleted = true;
      const summary = this.buildSummary();
      this.destination.writeLog("error", summary);
      this.destination.onTasksStopped();
    }
  }

  /**
   * Waits for all tasks to complete.
   *
   * CRITICAL: This method ensures that we don't proceed with the next
   * operations until all tasks are finished. Without this, tasks continue
   * running in background causing UI spam.
   *
   * @returns Promise that resolves when all tasks are finished
   */
  async waitForCompletion(): Promise<void> {
    await this.tasksPromise;
  }

  /**
   * Notify that an individual task has completed successfully.
   * Called internally when tasks execute.
   */
  notifyTaskCompleted(taskTitle: string): void {
    if (!this.isCompleted) {
      this.completed++;
      this.destination.writeLog("info", `  [done] ${taskTitle}`);
    }
  }

  /**
   * Notify that an individual task has failed.
   * Called internally when tasks execute.
   */
  notifyTaskFailed(taskTitle: string, error: string): void {
    if (!this.isCompleted) {
      this.failed++;
      this.destination.writeLog("error", `  [failed] ${taskTitle}: ${error}`);
    }
  }

  /**
   * Build completion summary message.
   */
  private buildSummary(): string {
    let summary = `Tasks completed: ${this.completed}/${this.totalTasks}`;

    if (this.failed > 0) {
      summary += `, Failed: ${this.failed}`;
    }

    return summary;
  }
}
