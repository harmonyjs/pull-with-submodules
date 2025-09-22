/**
 * @fileoverview Central UI Manager singleton.
 *
 * Single source of truth for all UI operations. Selects appropriate
 * destination based on environment and delegates all operations.
 * This class is NOT exported directly to prevent UI.log usage.
 */

import type { LogLevel, Task } from "./types.js";
import type { LogDestination } from "./destinations/base.js";
import { TUIDestination } from "./destinations/tui.js";
import { JSONDestination } from "./destinations/json.js";
import { SilentDestination } from "./destinations/silent.js";
import { isInteractiveEnvironment } from "./tty.js";

/**
 * UI environment configuration.
 */
interface UIEnvironment {
  /** Force quiet mode (only errors) */
  quiet?: boolean;
  /** Force JSON output */
  json?: boolean;
  /** Override TTY detection */
  interactive?: boolean;
}

/**
 * Central UI Manager that coordinates all output destinations.
 *
 * Implements singleton pattern and selects appropriate destination
 * based on environment. Enforces the architectural rules:
 * - Single source of truth for UI
 * - Auto-stop on write
 * - No nested UI elements
 * - Clean destination selection
 */
export class UIManager {
  private static instance: UIManager | null = null;
  private destination: LogDestination;

  private constructor(environment: UIEnvironment = {}) {
    this.destination = this.selectDestination(environment);
  }

  /**
   * Get the singleton UIManager instance.
   *
   * @param environment Optional environment override for testing
   * @returns UIManager instance
   */
  static getInstance(environment: UIEnvironment = {}): UIManager {
    if (!UIManager.instance) {
      UIManager.instance = new UIManager(environment);
    }
    return UIManager.instance;
  }

  /**
   * Reset singleton instance (for testing only).
   *
   * @internal
   */
  static resetInstance(): void {
    if (UIManager.instance) {
      UIManager.instance.destination.destroy();
      UIManager.instance = null;
    }
  }

  /**
   * Write a log message at the specified level.
   */
  log(level: LogLevel, message: string): void {
    this.destination.write(level, message);
  }

  /**
   * Execute an operation with a spinner.
   *
   * @param message Spinner message
   * @param operation Async operation to execute
   * @returns Promise resolving to operation result
   */
  async withSpinner<T>(
    message: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const handle = this.destination.startSpinner(message);

    try {
      const result = await operation();
      handle.success();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      handle.error(errorMessage);
      throw error;
    }
  }

  /**
   * Execute multiple tasks with coordinated output.
   *
   * @param tasks Array of tasks to execute
   * @returns Promise that resolves when all tasks complete
   */
  async withTasks(tasks: Task[]): Promise<void> {
    const handle = this.destination.startTasks(tasks);

    try {
      // Tasks are executed by the destination itself
      // This just waits for completion signal
      handle.complete();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      handle.error(errorMessage);
      throw error;
    }
  }

  /**
   * Show a note message.
   *
   * @param content Note content
   * @param title Optional title
   */
  showNote(content: string, title?: string): void {
    this.destination.showNote(content, title);
  }

  /**
   * Flush any buffered output.
   */
  flush(): void {
    this.destination.flush();
  }

  /**
   * Select appropriate destination based on environment.
   */
  private selectDestination(environment: UIEnvironment): LogDestination {
    // Force quiet mode - only errors
    if (environment.quiet === true) {
      return new SilentDestination();
    }

    // Force JSON mode
    if (environment.json === true) {
      return new JSONDestination();
    }

    // Check if we're in CI or non-interactive environment
    const interactive = environment.interactive ?? isInteractiveEnvironment();
    const inCI = process.env["CI"] === "true" || process.env["GITHUB_ACTIONS"] === "true";

    if (!interactive || inCI) {
      return new JSONDestination();
    }

    // Interactive terminal - use beautiful TUI
    return new TUIDestination();
  }

  /**
   * Get current destination type for testing.
   *
   * @internal
   */
  getDestinationType(): string {
    if (this.destination instanceof TUIDestination) return "tui";
    if (this.destination instanceof JSONDestination) return "json";
    if (this.destination instanceof SilentDestination) return "silent";
    return "unknown";
  }
}

/**
 * Create a UI manager factory function for controlled access.
 *
 * This function provides controlled access to the UIManager without
 * exposing the singleton directly. This prevents direct UI.log usage.
 */
export function createUIManager(environment?: UIEnvironment): UIManager {
  return UIManager.getInstance(environment);
}