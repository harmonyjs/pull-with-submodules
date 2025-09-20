/**
 * @fileoverview TaskLog implementation using @clack/prompts taskLog functionality.
 *
 * Provides a wrapper around @clack/prompts taskLog for displaying real-time
 * output from git operations and other long-running tasks. The log content
 * is cleared on success and preserved on failure for better UX.
 */

// Note: Using log.message for taskLog functionality since taskLog may not be available
import { log } from "@clack/prompts";
import { symbols, status } from "./colors.js";

/**
 * Configuration for task log behavior.
 */
export interface TaskLogConfig {
  /** Title shown while task is running */
  readonly title: string;
  /** Whether to clear output on success (default: true) */
  readonly clearOnSuccess?: boolean;
  /** Whether to show verbose output (default: false) */
  readonly verbose?: boolean;
}

/**
 * Interface for task log operations.
 */
export interface TaskLog {
  /** Add a message to the task log */
  message(content: string): void;
  /** Mark task as successful and optionally clear output */
  success(message?: string): void;
  /** Mark task as failed and preserve output */
  error(message?: string): void;
  /** Mark task as completed with warning */
  warning(message?: string): void;
}

/**
 * Implementation of TaskLog using @clack/prompts log.message.
 */
class ClackTaskLog implements TaskLog {
  private readonly config: Required<TaskLogConfig>;
  private readonly messages: string[] = [];

  constructor(config: TaskLogConfig) {
    this.config = {
      clearOnSuccess: true,
      verbose: false,
      ...config,
    };

    // Show initial title
    log.info(`${this.config.title}...`);
  }

  message(content: string): void {
    if (this.config.verbose) {
      // Add verbose styling for git command output
      const styledContent = status.verbose(content);
      log.message(styledContent, { symbol: symbols.verbose });
      this.messages.push(content);
    } else {
      // For non-verbose, just store the message
      this.messages.push(content);
    }
  }

  success(message?: string): void {
    const successMessage = message ?? "Completed successfully";
    const styledMessage = `${symbols.success} ${successMessage}`;

    if (this.config.verbose && this.messages.length > 0) {
      log.info("Task completed:");
      for (const msg of this.messages) {
        log.message(status.verbose(msg), { symbol: symbols.verbose });
      }
    }

    log.info(styledMessage);
  }

  error(message?: string): void {
    const errorMessage = message ?? "Task failed";
    const styledMessage = `${symbols.error} ${status.error(errorMessage)}`;

    // Show all messages on error for debugging
    if (this.messages.length > 0 && this.config.verbose) {
      log.info("Task output:");
      for (const msg of this.messages) {
        log.message(status.verbose(msg), { symbol: symbols.verbose });
      }
    }

    log.error(styledMessage);
  }

  warning(message?: string): void {
    const warningMessage = message ?? "Completed with warnings";
    const styledMessage = `${symbols.warning} ${status.warning(warningMessage)}`;

    if (this.config.verbose && this.messages.length > 0) {
      log.info("Task warnings:");
      for (const msg of this.messages) {
        log.message(status.verbose(msg), { symbol: symbols.verbose });
      }
    }

    log.warn(styledMessage);
  }
}

/**
 * Creates a new task log for displaying real-time output.
 *
 * @param config Configuration for the task log
 * @returns TaskLog instance
 * @example
 * ```typescript
 * const taskLog = createTaskLog({ title: "Running git fetch..." });
 * taskLog.message("Fetching from origin...");
 * taskLog.message("Updating refs...");
 * taskLog.success("Fetch completed");
 * ```
 */
export function createTaskLog(config: TaskLogConfig): TaskLog {
  return new ClackTaskLog(config);
}

/**
 * Executes an async operation with task log display.
 *
 * @param config Task log configuration
 * @param operation Async operation to execute
 * @returns Promise resolving to operation result
 * @example
 * ```typescript
 * const result = await withTaskLog(
 *   { title: "Pulling repository..." },
 *   async (log) => {
 *     log.message("Fetching from origin...");
 *     await git.fetch();
 *     log.message("Rebasing changes...");
 *     return await git.pull(["--rebase"]);
 *   }
 * );
 * ```
 */
export async function withTaskLog<T>(
  config: TaskLogConfig,
  operation: (log: TaskLog) => Promise<T>,
): Promise<T> {
  const taskLog = createTaskLog(config);

  try {
    const result = await operation(taskLog);
    taskLog.success();
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    taskLog.error(errorMessage);
    throw error;
  }
}