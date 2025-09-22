/**
 * @fileoverview Formatting utilities for logging.
 *
 * Contains helper functions for formatting log arguments
 * and converting values to displayable strings.
 */

/**
 * Formats arguments for logging, properly serializing objects while preserving primitives.
 *
 * @param args Array of arguments to format
 * @returns Formatted string with all arguments joined by spaces
 */
export function formatLogArgs(args: unknown[]): string {
  const JSON_INDENT = 2;

  return args
    .map((arg) => {
      if (arg === null || arg === undefined) {
        return String(arg);
      }
      if (typeof arg === "object") {
        return JSON.stringify(arg, null, JSON_INDENT);
      }
      if (typeof arg === "string") {
        return arg;
      }
      if (typeof arg === "number" || typeof arg === "boolean") {
        return String(arg);
      }
      return JSON.stringify(arg);
    })
    .join(" ");
}
