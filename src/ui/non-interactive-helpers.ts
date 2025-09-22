/**
 * @fileoverview Non-interactive mode helpers for TUI operations.
 *
 * Contains functions to handle spinner and task operations
 * when running in non-interactive environments.
 */

import { symbols } from "./colors.js";
import type { LogImplementation, Task } from "./types.js";

/**
 * Executes a spinner operation in non-interactive mode.
 */
export async function executeSpinnerNonInteractive<T>(
  message: string,
  operation: () => Promise<T>,
  logImpl: LogImplementation,
): Promise<T> {
  logImpl.info(`${symbols.process} ${message}...`);
  try {
    const result = await operation();
    logImpl.info(`${symbols.success} ${message} completed`);
    return result;
  } catch (error) {
    logImpl.error(`${symbols.error} ${message} failed`);
    throw error;
  }
}

/**
 * Executes tasks sequentially in non-interactive mode.
 */
export async function executeTasksNonInteractive(
  tasks: Task[],
  logImpl: LogImplementation,
): Promise<void> {
  for (const task of tasks) {
    logImpl.info(`${symbols.process} ${task.title}...`);
    try {
      await task.task();
      logImpl.info(`${symbols.success} ${task.title} completed`);
    } catch (error) {
      logImpl.error(`${symbols.error} ${task.title} failed`);
      throw error;
    }
  }
}
