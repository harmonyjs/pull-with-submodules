/**
 * @fileoverview JSON-specific tasks handle.
 */

import type { TaskHandle } from "#ui/destinations/base";
import type { JSONDestination } from "./destination.js";

/**
 * JSON-specific tasks handle.
 */
export class JSONTaskHandle implements TaskHandle {
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
