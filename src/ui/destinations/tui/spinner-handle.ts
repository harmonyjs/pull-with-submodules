/**
 * @fileoverview TUI-specific spinner implementation with simplified lifecycle management.
 */

import type { SpinnerHandle } from "#ui/destinations/base";
import type { TUIDestination } from "./destination.js";
import type { ClackSpinnerInstance } from "./types.js";

/**
 * TUI-specific spinner implementation with simplified lifecycle management.
 */
export class TUISpinnerHandle implements SpinnerHandle {
  private isStopped = false;
  private isInterrupted = false;

  constructor(
    private readonly spinnerInstance: ClackSpinnerInstance,
    private readonly destination: TUIDestination,
    private readonly initialMessage: string,
  ) {}

  success(message?: string): void {
    this.stop(message ?? `${this.initialMessage} completed`, 0);
  }

  error(message?: string): void {
    if (!this.isInterrupted) {
      this.stop(message ?? `${this.initialMessage} failed`, 1);
    }
  }

  interrupt(): void {
    this.isInterrupted = true;
    this.stop("", 0);
  }

  update(message: string): void {
    if (this.destination.isActiveSpinner(this) && !this.isStopped) {
      this.spinnerInstance.message(message);
    }
  }

  /**
   * Internal method to stop spinner.
   */
  private stop(message: string, exitCode: number): void {
    if (!this.destination.isActiveSpinner(this) || this.isStopped) {
      return; // Already stopped or not active
    }

    this.isStopped = true;
    this.spinnerInstance.stop(message, exitCode);
    this.destination.onSpinnerStopped();
  }
}
