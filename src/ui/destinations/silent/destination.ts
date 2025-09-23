/**
 * @fileoverview Silent destination that suppresses most output.
 *
 * Only shows error messages to stderr, everything else is discarded.
 * Used when the application runs in quiet mode.
 */

import type { LogLevel, Task } from "#ui/types";
import {
  BaseLogDestination,
  type SpinnerHandle,
  type TaskHandle,
} from "#ui/destinations/base";
import { SilentSpinnerHandle } from "./spinner-handle.js";
import { SilentTaskHandle } from "./task-handle.js";

/**
 * Silent destination that suppresses most output.
 *
 * Only shows error messages to stderr, everything else is discarded.
 * Used when the application runs in quiet mode.
 */
export class SilentDestination extends BaseLogDestination {
  // eslint-disable-next-line class-methods-use-this -- Abstract method implementation
  protected writeOutput(level: LogLevel, message: string): void {
    // Only output errors in silent mode
    if (level === "error") {
      console.error(message);
    }
    // All other levels are silently discarded
  }

  protected createSpinner(): SpinnerHandle {
    // Return a no-op spinner handle
    return new SilentSpinnerHandle(this);
  }

  protected createTasks(tasks: Task[]): TaskHandle {
    // Execute tasks silently
    return new SilentTaskHandle(this, tasks);
  }

  // eslint-disable-next-line class-methods-use-this -- Abstract method implementation
  protected showNoteOutput(): void {
    // Notes are not shown in silent mode
  }

  /**
   * Called when spinner handle completes.
   * Part of the handle callback interface.
   */
  onSpinnerStopped(): void {
    this.activeElement = "none";
    // No buffering in silent mode, just mark as stopped
  }

  /**
   * Called when tasks handle completes.
   * Part of the handle callback interface.
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
