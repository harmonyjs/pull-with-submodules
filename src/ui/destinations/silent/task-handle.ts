/**
 * @fileoverview Silent tasks handle that executes tasks without output.
 */

import type { Task } from "#ui/types";
import type { TaskHandle } from "#ui/destinations/base";
import type { SilentDestination } from "./destination.js";

/**
 * Silent tasks handle that executes tasks without output.
 */
export class SilentTaskHandle implements TaskHandle {
  constructor(
    private readonly destination: SilentDestination,
    private readonly tasks: Task[],
  ) {
    void this.executeTasks();
  }

  complete(): void {
    this.destination.onTasksStopped();
  }

  error(message?: string): void {
    if (message !== null && message !== "") {
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
