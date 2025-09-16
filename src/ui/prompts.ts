/**
 * @fileoverview Type-safe prompts wrapper using @clack/prompts.
 *
 * Provides standardized user interaction patterns for the CLI application,
 * including intro/outro messaging, confirmations, and cancellation handling.
 * All prompts are designed to gracefully handle Ctrl+C interruption and
 * provide consistent visual styling.
 *
 * Key features:
 * - Standardized intro/outro for application branding
 * - Type-safe confirmation prompts with default values
 * - Graceful cancellation handling (process.exit on Ctrl+C)
 * - Consistent visual styling across all interactions
 */

import * as clack from "@clack/prompts";

/**
 * Standard application introduction message.
 * Shows the application name and purpose at startup.
 *
 * @example
 * intro();
 * // ... other operations ...
 * outro("All submodules updated successfully!");
 */
export function intro(): void {
  clack.intro("🔄 pull-with-submodules");
}

/**
 * Standard application conclusion message.
 * Shows completion status and any final information.
 *
 * @param message Final message to display to the user.
 * @example
 * outro("All submodules updated successfully!");
 * outro("Operation cancelled by user");
 */
export function outro(message: string): void {
  clack.outro(message);
}

/**
 * Prompts user for yes/no confirmation with safe cancellation handling.
 *
 * @param message Question to ask the user.
 * @param defaultValue Default value when user just presses Enter.
 * @returns Promise resolving to user's boolean choice.
 * @throws Will exit process if user cancels (Ctrl+C).
 * @example
 * const proceed = await confirm("Continue with rebase?", false);
 * if (proceed) {
 *   // proceed with rebase
 * }
 */
export async function confirm(
  message: string,
  defaultValue: boolean = true,
): Promise<boolean> {
  const result = await clack.confirm({
    message,
    initialValue: defaultValue,
  });

  if (clack.isCancel(result)) {
    clack.cancel("Operation cancelled by user");
    process.exit(1);
  }

  return result;
}

/**
 * Displays a spinner with the given message while executing an async operation.
 *
 * @param message Loading message to display.
 * @param operation Async operation to execute while showing spinner.
 * @returns Promise resolving to the operation's result.
 * @example
 * const result = await spinner("Fetching remote changes...", async () => {
 *   return await git.fetch();
 * });
 */
export async function spinner<T>(
  message: string,
  operation: () => Promise<T>,
): Promise<T> {
  const s = clack.spinner();
  s.start(message);

  try {
    const result = await operation();
    s.stop("✅ Done");
    return result;
  } catch (error) {
    s.stop("❌ Failed");
    throw error;
  }
}

/**
 * Shows a note message to the user (non-interactive information).
 *
 * @param message Information message to display.
 * @param type Type of note (affects styling).
 * @example
 * note("Found 3 submodules to process", "info");
 * note("Some submodules failed to update", "warning");
 */
export function note(
  message: string,
  type: "info" | "warning" | "error" = "info",
): void {
  clack.note(
    message,
    type === "info"
      ? "ℹ️  Info"
      : type === "warning"
        ? "⚠️  Warning"
        : "❌ Error",
  );
}

/**
 * Handles cancellation consistently across the application.
 * Should be called when detecting user cancellation in any prompt.
 *
 * @param message Optional cancellation message.
 * @param exitCode Exit code to use (default: 1).
 * @example
 * if (clack.isCancel(result)) {
 *   handleCancellation("User cancelled the operation");
 * }
 */
export function handleCancellation(
  message: string = "Operation cancelled by user",
  exitCode: number = 1,
): never {
  clack.cancel(message);
  process.exit(exitCode);
}
