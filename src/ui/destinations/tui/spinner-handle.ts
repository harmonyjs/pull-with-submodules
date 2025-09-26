/**
 * @fileoverview TUI-specific spinner implementation using simple log messages.
 */

import type { SpinnerHandle } from "#ui/destinations/base";
import type { TUIDestination } from "./destination.js";

/**
 * TUI-specific spinner implementation using simple log messages instead of animated spinners.
 *
 * This implementation shows:
 * - Start: "{message}..."
 * - Success: "{message}"
 * - Error: "{message}"
 * - Updates: "  {message}" (indented)
 */
export class TUISpinnerHandle implements SpinnerHandle {
  private isStopped = false;
  private isInterrupted = false;

  constructor(
    private readonly destination: TUIDestination,
    private readonly initialMessage: string,
  ) {
    // Show initial message immediately using step symbol (◇)
    this.destination.writeLog("step", `${this.initialMessage}...`);
  }

  success(message?: string): void {
    if (!this.isInterrupted && !this.isStopped) {
      const finalMessage = message ?? `${this.initialMessage} completed`;
      this.destination.writeLog("info", finalMessage);
      this.markStopped();
    }
  }

  error(message?: string): void {
    if (!this.isInterrupted && !this.isStopped) {
      const errorMessage = message ?? `${this.initialMessage} failed`;
      this.destination.writeLog("error", errorMessage);
      this.markStopped();
    }
  }

  interrupt(): void {
    this.isInterrupted = true;
    this.markStopped();
  }

  update(message: string): void {
    if (
      this.destination.isActiveSpinner(this) &&
      !this.isStopped &&
      !this.isInterrupted
    ) {
      // Show update as indented step message using step symbol (◇)
      this.destination.writeLog("step", `  ${message}`);
    }
  }

  /**
   * Mark spinner as stopped and notify destination.
   */
  private markStopped(): void {
    if (!this.isStopped) {
      this.isStopped = true;
      this.destination.onSpinnerStopped();
    }
  }
}
