/**
 * @fileoverview Central UI Manager singleton.
 *
 * Single source of truth for all UI operations. Selects appropriate
 * destination based on environment and delegates all operations.
 * This class is NOT exported directly to prevent UI.log usage.
 */

import type { LogLevel, Task } from "./types.js";
import type { LogDestination } from "./destinations/base.js";
import { TUIDestination } from "./destinations/tui/index.js";
import { JSONDestination } from "./destinations/json/index.js";
import { SilentDestination } from "./destinations/silent/index.js";
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
  private readonly destination: LogDestination;

  private constructor(environment: UIEnvironment = {}) {
    this.destination = this.selectDestination(environment);
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      handle.error(errorMessage);
      throw error;
    }
  }

  /**
   * Execute multiple tasks with coordinated output.
   *
   * CRITICAL: This method MUST wait for all tasks to complete before resolving.
   * The previous implementation was returning immediately, causing tasks to run
   * in background and creating UI spam after outro().
   *
   * @param tasks Array of tasks to execute
   * @returns Promise that resolves ONLY when all tasks are complete
   */
  async withTasks(tasks: Task[]): Promise<void> {
    const handle = this.destination.startTasks(tasks);

    try {
      // IMPORTANT: Wait for tasks to actually complete, not just start
      // Check if handle has waitForCompletion method (TUI destinations)
      if ('waitForCompletion' in handle && typeof handle.waitForCompletion === 'function') {
        await (handle as { waitForCompletion(): Promise<void> }).waitForCompletion();
      }

      handle.complete();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      handle.error(errorMessage);
      throw error; // Re-throw instead of wrapping
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

  /**
   * Select appropriate destination based on environment.
   */
  // eslint-disable-next-line class-methods-use-this -- Factory method doesn't need instance state
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
    const inCI =
      process.env["CI"] === "true" || process.env["GITHUB_ACTIONS"] === "true";

    if (!interactive || inCI) {
      return new JSONDestination();
    }

    // Interactive terminal - use beautiful TUI
    return new TUIDestination();
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
