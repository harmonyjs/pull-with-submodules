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
 * Symbol definitions and visual hierarchy for logging levels.
 *
 * Visual hierarchy (importance): verbose (*) < step (◇) < info (●) < warn (▲) < error
 *
 * Symbol meanings:
 * - * (verbose): Debug/verbose information, gray color, low importance
 * - ◇ (step): Process start/in-progress, used by log.step(), indicates beginning of operations
 * - ● (info): Completion/result, used by log.info(), indicates finished state or status
 * - ▲ (warn): Warnings, used by log.warn(), indicates issues requiring attention
 * - (error): Errors, used by log.error(), highest importance, indicates failures
 *
 * @clack/prompts handles standard UI symbols automatically (◇, ●, ▲).
 * This exports only custom symbols not provided by @clack/prompts.
 */
export const symbols = {
  verbose: pc.gray("*"),

  // Repository status symbols (standalone use only)
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
export function colorizeStatus(statusText: string): string {
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
    // For up-to-date status, return empty string since we don't need a symbol
    return "";
  }
}
