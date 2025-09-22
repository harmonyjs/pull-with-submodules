/**
 * @fileoverview Silent destination for quiet mode operation.
 *
 * Minimal output destination that only shows error messages
 * and suppresses all other output. Used in quiet mode.
 */

import type { LogLevel, Task } from "#ui/types";
import {
  BaseLogDestination,
  type SpinnerHandle,
  type TaskHandle,
} from "./base.js";

/**
 * Silent spinner handle that does nothing.
 */
class SilentSpinnerHandle implements SpinnerHandle {
  constructor(private readonly destination: SilentDestination) {}

  success(_message?: string): void {
    this.destination.onSpinnerStopped();
  }

  error(message?: string): void {
    if (message) {
      // Only show error messages in silent mode
      console.error(message);
    }
    this.destination.onSpinnerStopped();
  }

  update(_message: string): void {
    // Silent mode doesn't show updates
  }
}

/**
 * Silent tasks handle that executes tasks without output.
 */
class SilentTaskHandle implements TaskHandle {
  constructor(
    private readonly destination: SilentDestination,
    private readonly tasks: Task[],
  ) {
    this.executeTasks();
  }

  complete(): void {
    this.destination.onTasksStopped();
  }

  error(message?: string): void {
    if (message) {
      console.error(message);
    }
    this.destination.onTasksStopped();
  }

  private async executeTasks(): Promise<void> {
    try {
      for (const task of this.tasks) {
        await task.task();
      }
      this.complete();
    } catch (error) {
      this.error(error instanceof Error ? error.message : String(error));
    }
  }
}

/**
 * Silent destination that suppresses most output.
 *
 * Only shows error messages to stderr, everything else is discarded.
 * Used when the application runs in quiet mode.
 */
export class SilentDestination extends BaseLogDestination {
  protected writeOutput(level: LogLevel, message: string): void {
    // Only output errors in silent mode
    if (level === "error") {
      console.error(message);
    }
    // All other levels are silently discarded
  }

  protected createSpinner(_message: string): SpinnerHandle {
    // Return a no-op spinner handle
    return new SilentSpinnerHandle(this);
  }

  protected createTasks(tasks: Task[]): TaskHandle {
    // Execute tasks silently
    return new SilentTaskHandle(this, tasks);
  }

  protected showNoteOutput(_content: string, _title?: string): void {
    // Notes are not shown in silent mode
  }

  /**
   * Called when spinner handle completes.
   */
  onSpinnerStopped(): void {
    this.activeElement = "none";
    // No buffering in silent mode, just mark as stopped
  }

  /**
   * Called when tasks handle completes.
   */
  onTasksStopped(): void {
    this.activeElement = "none";
    // No buffering in silent mode, just mark as stopped
  }

  /**
   * Override flush to do nothing in silent mode.
   */
  override flush(): void {
    this.activeElement = "none";
    // No buffering to flush in silent mode
  }

  /**
   * Override destroy to do nothing in silent mode.
   */
  override destroy(): void {
    this.activeElement = "none";
    // Nothing to clean up in silent mode
  }
}