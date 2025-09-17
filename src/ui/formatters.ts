/**
 * @fileoverview Pure formatting functions for CLI output presentation.
 */

import type { UpdateResult } from "../types/core.js";

/**
 * Formats duration from milliseconds to human-readable string.
 *
 * @param milliseconds Duration in milliseconds.
 * @returns Formatted duration string.
 * @example
 * formatDuration(1234) // "1.2s"
 * formatDuration(65000) // "1m 5s"
 * formatDuration(3661000) // "1h 1m 1s"
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  const fractionalSeconds = (milliseconds / 1000).toFixed(1);
  return `${fractionalSeconds}s`;
}

/**
 * Formats git commit hash for display.
 *
 * @param sha Full or partial git commit SHA.
 * @param short Whether to abbreviate to 7 characters (default: false).
 * @returns Formatted git hash string.
 * @example
 * formatGitHash("abcdef1234567890") // "abcdef1234567890"
 * formatGitHash("abcdef1234567890", true) // "abcdef1"
 */
export function formatGitHash(sha: string, short: boolean = false): string {
  if (short && sha.length > 7) {
    return sha.substring(0, 7);
  }
  return sha;
}

/**
 * Formats submodule path with visual highlighting.
 *
 * @param path Submodule path relative to repository root.
 * @returns Formatted path string with visual emphasis.
 * @example
 * formatSubmodulePath("libs/common") // "📁 libs/common"
 */
export function formatSubmodulePath(path: string): string {
  return `📁 ${path}`;
}

/**
 * Calculates optimal column widths for the summary table.
 *
 * @param results Array of submodule update results.
 * @returns Column width configuration.
 */
function calculateColumnWidths(results: UpdateResult[]): {
  pathWidth: number;
  statusWidth: number;
  sourceWidth: number;
  shaWidth: number;
  durationWidth: number;
  totalWidth: number;
} {
  const pathWidth = Math.max(4, ...results.map((r) => r.submodule.path.length));
  const statusWidth = Math.max(6, ...results.map((r) => r.status.length));
  const sourceWidth = 8; // "remote" or "local" or "-"
  const shaWidth = 9; // 7 chars + "..." or "-"
  const durationWidth = 10; // "999.9s" or similar

  const totalWidth =
    pathWidth + statusWidth + sourceWidth + shaWidth + durationWidth + 13; // 13 for separators

  return {
    pathWidth,
    statusWidth,
    sourceWidth,
    shaWidth,
    durationWidth,
    totalWidth,
  };
}

/**
 * Creates horizontal border line for table.
 *
 * @param widths Column width configuration.
 * @param borderType Type of border (top, middle, data-separator).
 * @returns Border line string.
 */
function createBorderLine(
  widths: ReturnType<typeof calculateColumnWidths>,
  borderType: "top" | "middle" | "data-separator",
): string {
  const { pathWidth, statusWidth, sourceWidth, shaWidth, durationWidth } =
    widths;

  if (borderType === "top") {
    return (
      "├" +
      "─".repeat(pathWidth + 1) +
      "┬" +
      "─".repeat(statusWidth + 1) +
      "┬" +
      "─".repeat(sourceWidth + 1) +
      "┬" +
      "─".repeat(shaWidth + 1) +
      "┬" +
      "─".repeat(durationWidth + 1) +
      "┤"
    );
  }

  return (
    "├" +
    "─".repeat(pathWidth + 1) +
    "┼" +
    "─".repeat(statusWidth + 1) +
    "┼" +
    "─".repeat(sourceWidth + 1) +
    "┼" +
    "─".repeat(shaWidth + 1) +
    "┼" +
    "─".repeat(durationWidth + 1) +
    "┤"
  );
}

/**
 * Creates table header lines with borders and column headers.
 *
 * @param widths Column width configuration.
 * @returns Array of header lines.
 */
function createTableHeader(
  widths: ReturnType<typeof calculateColumnWidths>,
): string[] {
  const {
    pathWidth,
    statusWidth,
    sourceWidth,
    shaWidth,
    durationWidth,
    totalWidth,
  } = widths;

  const lines: string[] = [];
  lines.push("┌" + "─".repeat(totalWidth - 2) + "┐");
  lines.push("│" + " Submodule Update Summary".padEnd(totalWidth - 2) + "│");
  lines.push(createBorderLine(widths, "top"));

  // Header row
  const header =
    "│ " +
    "Path".padEnd(pathWidth) +
    " │ " +
    "Status".padEnd(statusWidth) +
    " │ " +
    "Source".padEnd(sourceWidth) +
    " │ " +
    "SHA".padEnd(shaWidth) +
    " │ " +
    "Duration".padEnd(durationWidth) +
    " │";
  lines.push(header);
  lines.push(createBorderLine(widths, "data-separator"));

  return lines;
}

/**
 * Creates a formatted summary table from update results.
 *
 * @param results Array of submodule update results.
 * @returns Multi-line formatted table string.
 * @example
 * const table = formatSummaryTable(results);
 * console.log(table);
 */
export function formatSummaryTable(results: UpdateResult[]): string {
  if (results.length === 0) {
    return "No submodules processed.";
  }

  const widths = calculateColumnWidths(results);
  const lines = createTableHeader(widths);
  const { pathWidth, statusWidth, sourceWidth, shaWidth, durationWidth } =
    widths;

  // Data rows
  for (const result of results) {
    const path = result.submodule.path.padEnd(pathWidth);
    const status = result.status.padEnd(statusWidth);
    const source = (result.selection?.source ?? "-").padEnd(sourceWidth);
    const sha = (
      result.selection ? formatGitHash(result.selection.sha, true) : "-"
    ).padEnd(shaWidth);
    const duration = formatDuration(result.duration).padEnd(durationWidth);

    const row = `│ ${path} │ ${status} │ ${source} │ ${sha} │ ${duration} │`;
    lines.push(row);
  }

  // Footer
  lines.push(
    "└" +
      "─".repeat(pathWidth + 1) +
      "┴" +
      "─".repeat(statusWidth + 1) +
      "┴" +
      "─".repeat(sourceWidth + 1) +
      "┴" +
      "─".repeat(shaWidth + 1) +
      "┴" +
      "─".repeat(durationWidth + 1) +
      "┘",
  );

  return lines.join("\n");
}

/**
 * Formats a status icon based on submodule processing result.
 *
 * @param status Submodule processing status.
 * @returns Emoji icon representing the status.
 * @example
 * formatStatusIcon("updated") // "✅"
 * formatStatusIcon("failed") // "❌"
 */
export function formatStatusIcon(
  status: "updated" | "skipped" | "failed",
): string {
  switch (status) {
    case "updated":
      return "✅";
    case "skipped":
      return "⏭️";
    case "failed":
      return "❌";
    default:
      return "❓";
  }
}

/**
 * Formats aggregate statistics for a batch of update results.
 *
 * @param results Array of submodule update results.
 * @returns Formatted statistics string.
 * @example
 * formatStatistics(results) // "3 updated, 1 skipped, 1 failed (total: 5)"
 */
export function formatStatistics(results: UpdateResult[]): string {
  const counts = {
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  for (const result of results) {
    counts[result.status]++;
  }

  const parts: string[] = [];
  if (counts.updated > 0) parts.push(`${counts.updated} updated`);
  if (counts.skipped > 0) parts.push(`${counts.skipped} skipped`);
  if (counts.failed > 0) parts.push(`${counts.failed} failed`);

  const summary = parts.join(", ");
  return `${summary} (total: ${results.length})`;
}
