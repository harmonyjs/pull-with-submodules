/**
 * @fileoverview Base interfaces for log destinations.
 *
 * Defines the core contracts for different output destinations (TUI, JSON, Silent)
 * with auto-stop functionality and simple operation handles.
 */

import type { LogLevel, Task } from "#ui/types";

/**
 * Handle for controlling an active spinner operation.
 */
export interface SpinnerHandle {
  /** Mark spinner as successful and optionally provide completion message */
  success(message?: string): void;
  /** Mark spinner as failed and optionally provide error message */
  error(message?: string): void;
  /** Update spinner message while still running */
  update(message: string): void;
}

/**
 * Handle for controlling an active tasks operation.
 */
export interface TaskHandle {
  /** Mark all tasks as completed */
  complete(): void;
  /** Mark tasks as failed with error message */
  error(message?: string): void;
}

/**
 * Core interface for all log destinations.
 *
 * Implements the "One Active Element" and "Auto-stop on Write" rules:
 * - Only one UI element (spinner/tasks) can be active at a time
 * - Any write() call automatically stops active UI elements
 * - Simple handles replace complex TaskLog abstractions
 */
export interface LogDestination {
  /**
   * Write a log message at the specified level.
   * RULE: This method MUST auto-stop any active UI elements.
   *
   * @param level Log level (info, warn, error, verbose, debug)
   * @param message Formatted message to output
   */
  write(level: LogLevel, message: string): void;

  /**
   * Start a spinner operation.
   * RULE: This method MUST auto-stop any currently active UI elements.
   *
   * @param message Initial spinner message
   * @returns Handle to control the spinner
   */
  startSpinner(message: string): SpinnerHandle;

  /**
   * Start a tasks operation.
   * RULE: This method MUST auto-stop any currently active UI elements.
   *
   * @param tasks Array of tasks to execute
   * @returns Handle to control the tasks
   */
  startTasks(tasks: Task[]): TaskHandle;

  /**
   * Show a note message (typically used for summaries or important info).
   *
   * @param content Note content
   * @param title Optional title for the note
   */
  showNote(content: string, title?: string): void;

  /**
   * Flush any buffered output and prepare for shutdown.
   */
  flush(): void;

  /**
   * Clean up resources and prepare for destruction.
   */
  destroy(): void;
}

/**
 * Base implementation providing common functionality for all destinations.
 *
 * Enforces the "One Active Element" rule by tracking active state
 * and provides auto-stop functionality.
 */
export abstract class BaseLogDestination implements LogDestination {
  protected activeElement: "none" | "spinner" | "tasks" = "none";
  protected buffer: Array<{ level: LogLevel; message: string }> = [];

  /**
   * Implementation must handle the actual output for the destination.
   */
  protected abstract writeOutput(level: LogLevel, message: string): void;

  /**
   * Implementation must create spinner for the destination.
   */
  protected abstract createSpinner(message: string): SpinnerHandle;

  /**
   * Implementation must create tasks for the destination.
   */
  protected abstract createTasks(tasks: Task[]): TaskHandle;

  /**
   * Implementation must show note for the destination.
   */
  protected abstract showNoteOutput(content: string, title?: string): void;

  write(level: LogLevel, message: string): void {
    // RULE: Auto-stop any active UI elements
    this.stopActiveElement();
    this.writeOutput(level, message);
  }

  startSpinner(message: string): SpinnerHandle {
    // RULE: Auto-stop any currently active UI elements
    this.stopActiveElement();
    this.activeElement = "spinner";
    return this.createSpinner(message);
  }

  startTasks(tasks: Task[]): TaskHandle {
    // RULE: Auto-stop any currently active UI elements
    this.stopActiveElement();
    this.activeElement = "tasks";
    return this.createTasks(tasks);
  }

  showNote(content: string, title?: string): void {
    // Notes don't interfere with active elements, just output directly
    this.showNoteOutput(content, title);
  }

  flush(): void {
    this.stopActiveElement();
    this.flushBuffer();
  }

  destroy(): void {
    this.stopActiveElement();
    this.buffer = [];
  }

  /**
   * Stops any currently active UI element.
   * Subclasses should override to implement destination-specific stopping.
   */
  protected stopActiveElement(): void {
    if (this.activeElement !== "none") {
      this.activeElement = "none";
      this.flushBuffer();
    }
  }

  /**
   * Buffers a log message during UI operations.
   */
  protected bufferMessage(level: LogLevel, message: string): void {
    this.buffer.push({ level, message });
  }

  /**
   * Flushes buffered messages to output.
   */
  protected flushBuffer(): void {
    for (const entry of this.buffer) {
      this.writeOutput(entry.level, entry.message);
    }
    this.buffer = [];
  }
}