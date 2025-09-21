/**
 * @fileoverview Color utilities using picocolors for consistent styling.
 *
 * Provides standardized color functions for different types of output including
 * status indicators, verbose logs, and UI elements. Uses picocolors for
 * cross-platform color support.
 */

import pc from "picocolors";

/**
 * Status-based color functions for consistent visual indicators.
 */
export const status = {
  success: (text: string): string => pc.green(text),
  warning: (text: string): string => pc.yellow(text),
  error: (text: string): string => pc.red(text),
  info: (text: string): string => pc.blue(text),
  verbose: (text: string): string => pc.gray(text),
  muted: (text: string): string => pc.dim(text),
} as const;

/**
 * Symbol-based color functions for status indicators.
 * Uses semantic symbols for process states vs. results.
 */
export const symbols = {
  // Process indicators (for ongoing operations)
  process: pc.gray("*"),
  step: pc.gray("◇"),

  // Result indicators (for final outcomes)
  success: pc.green("◇"),
  warning: pc.yellow("▲"),
  error: pc.red("◇"),
  info: pc.blue("◇"),

  // Status-specific symbols
  verbose: pc.gray("*"),
  updated: pc.green("+"),
  upToDate: pc.cyan("="),
  skipped: pc.yellow("-"),
  failed: pc.red("x"),

  // Special modes
  dryRun: pc.blue("●"),
  ahead: pc.cyan("↑"),
  behind: pc.yellow("↓"),
  diverged: pc.magenta("⚡"),
} as const;

/**
 * Background color functions for headers and emphasis.
 */
export const backgrounds = {
  title: (text: string): string => pc.inverse(pc.bold(text)),
  warning: (text: string): string => pc.bgYellow(pc.black(pc.bold(text))),
  error: (text: string): string => pc.bgRed(pc.white(pc.bold(text))),
  success: (text: string): string => pc.bgGreen(pc.black(pc.bold(text))),
} as const;

/**
 * Text style functions for emphasis and hierarchy.
 */
export const styles = {
  bold: (text: string): string => pc.bold(text),
  italic: (text: string): string => pc.italic(text),
  underline: (text: string): string => pc.underline(text),
  dim: (text: string): string => pc.dim(text),
} as const;

/**
 * Utility function to colorize submodule status.
 */
export function colorizeStatus(
  statusText: string,
): string {
  switch (statusText) {
    case "updated":
      return status.success(statusText);
    case "up-to-date":
      return status.info(statusText);
    case "skipped":
      return status.warning(statusText);
    case "failed":
      return status.error(statusText);
    default:
      return statusText;
  }
}

/**
 * Utility function to get status symbol by status name.
 */
export function getStatusSymbol(
  statusText: string,
): string {
  switch (statusText) {
    case "updated":
      return symbols.updated;
    case "up-to-date":
      return symbols.upToDate;
    case "skipped":
      return symbols.skipped;
    case "failed":
      return symbols.failed;
    default:
      return symbols.info;
  }
}

/**
 * Utility function to get repository status symbol.
 */
export function getRepositoryStatusSymbol(status: {
  ahead?: number;
  behind?: number;
}): string {
  const aheadCount = status.ahead ?? 0;
  const behindCount = status.behind ?? 0;

  if (aheadCount > 0 && behindCount > 0) {
    return symbols.diverged;
  } else if (aheadCount > 0) {
    return symbols.ahead;
  } else if (behindCount > 0) {
    return symbols.behind;
  } else {
    return symbols.upToDate;
  }
}

/**
 * Gets appropriate symbol for process vs result context.
 */
export function getContextualSymbol(context: "process" | "result", type: "success" | "warning" | "error" | "info" = "info"): string {
  if (context === "process") {
    return symbols.process;
  }

  switch (type) {
    case "success":
      return symbols.success;
    case "warning":
      return symbols.warning;
    case "error":
      return symbols.error;
    case "info":
      return symbols.info;
    default:
      return symbols.info;
  }
}