/**
 * @fileoverview Clack UI operations adapter.
 *
 * Provides UI-specific functionality from @clack/prompts including
 * spinners, tasks, prompts, and user interactions. Separated from
 * logging functionality for better separation of concerns.
 */

import {
  spinner as clackSpinner,
  tasks as clackTasks,
  intro as clackIntro,
  outro as clackOutro,
  confirm as clackConfirm,
  note as clackNote,
  cancel as clackCancel,
  isCancel,
} from "@clack/prompts";
import type { Task } from "./types.js";

/**
 * Spinner interface for coordinated UI operations.
 */
export interface SpinnerInstance {
  start(message: string): void;
  stop(message: string): void;
}

/**
 * Task definition for Clack tasks API.
 */
export interface ClackTask {
  title: string;
  task: () => Promise<string>;
}

/**
 * Clack UI adapter that provides user interface operations.
 *
 * Handles spinners, tasks, prompts, and other interactive UI elements
 * while maintaining clean separation from logging functionality.
 */
export class ClackUIAdapter {
  /**
   * Creates a spinner instance for progress indication.
   *
   * @returns Spinner instance with start/stop methods
   */
  static createSpinner(): SpinnerInstance {
    return clackSpinner();
  }

  /**
   * Executes multiple tasks with visual progress tracking.
   *
   * @param tasks Array of tasks to execute
   * @returns Promise that resolves when all tasks complete
   */
  static async executeTasks(tasks: ClackTask[]): Promise<void> {
    await clackTasks(tasks);
  }

  /**
   * Shows an introductory message.
   *
   * @param message Message to display
   */
  static intro(message: string): void {
    clackIntro(message);
  }

  /**
   * Shows a concluding message.
   *
   * @param message Message to display
   */
  static outro(message: string): void {
    clackOutro(message);
  }

  /**
   * Prompts user for confirmation.
   *
   * @param options Confirmation prompt options
   * @returns Promise resolving to user's choice
   */
  static async confirm(options: {
    message: string;
    initialValue?: boolean;
  }): Promise<boolean> {
    const result = await clackConfirm(options);
    if (isCancel(result)) {
      clackCancel("Operation cancelled.");
      process.exit(0);
    }
    return result;
  }

  /**
   * Displays a note message.
   *
   * @param message Note content
   * @param title Optional title for the note
   */
  static note(message: string, title?: string): void {
    clackNote(message, title);
  }

  /**
   * Converts internal Task format to Clack format.
   *
   * @param tasks Array of internal Task objects
   * @returns Array of ClackTask objects
   */
  static convertTasks(tasks: Task[]): ClackTask[] {
    return tasks.map((t) => ({
      title: t.title,
      task: async (): Promise<string> => {
        const result = await t.task();
        return result ?? "";
      },
    }));
  }
}
