/**
 * @fileoverview Silent spinner handle that does nothing.
 */

import type { SpinnerHandle } from "#ui/destinations/base";
import type { SilentDestination } from "./destination.js";

/**
 * Silent spinner handle that does nothing.
 */
export class SilentSpinnerHandle implements SpinnerHandle {
  constructor(private readonly destination: SilentDestination) {}

  success(): void {
    this.destination.onSpinnerStopped();
  }

  error(message?: string): void {
    if (message !== null && message !== "") {
      // Only show error messages in silent mode
      console.error(message);
    }
    this.destination.onSpinnerStopped();
  }

  // eslint-disable-next-line class-methods-use-this -- Interface implementation
  update(): void {
    // Silent mode doesn't show updates
  }
}
