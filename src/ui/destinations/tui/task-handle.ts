/**
 * @fileoverview TUI-specific tasks implementation.
 */

import type { TaskHandle } from "#ui/destinations/base";
import type { TUIDestination } from "./destination.js";

/**
 * TUI-specific tasks implementation.
 *
 * IMPORTANT: This handle tracks the actual completion of @clack/prompts tasks
 * to ensure we don't proceed until all tasks are finished.
 */
export class TUITaskHandle implements TaskHandle {
  constructor(
    private readonly destination: TUIDestination,
    private readonly tasksPromise: Promise<void>,
  ) {}

  // eslint-disable-next-line class-methods-use-this -- Interface implementation
  complete(): void {
    // Tasks complete automatically when the promise resolves
    // This is just for interface compliance
  }

  error(message?: string): void {
    if (message !== null && message !== "" && message !== undefined) {
      this.destination.write("error", message);
    }
    this.destination.onTasksStopped();
  }

  /**
   * Waits for all tasks to complete.
   *
   * CRITICAL: This method ensures that we don't proceed with the next
   * operations until @clack/prompts has finished rendering all tasks.
   * Without this, tasks continue running in background causing UI spam.
   *
   * @returns Promise that resolves when all tasks are finished
   */
  async waitForCompletion(): Promise<void> {
    await this.tasksPromise;
  }
}
