/**
 * @fileoverview TUI-specific tasks implementation.
 */

import type { TaskHandle } from "#ui/destinations/base";
import type { TUIDestination } from "./destination.js";

/**
 * TUI-specific tasks implementation.
 */
export class TUITaskHandle implements TaskHandle {
  constructor(private readonly destination: TUIDestination) {}

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
}
