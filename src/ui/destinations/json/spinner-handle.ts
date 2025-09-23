/**
 * @fileoverview JSON-specific spinner handle.
 */

import type { SpinnerHandle } from "#ui/destinations/base";
import type { JSONDestination } from "./destination.js";

/**
 * JSON-specific spinner handle.
 */
export class JSONSpinnerHandle implements SpinnerHandle {
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
