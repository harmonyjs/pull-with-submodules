/**
 * @fileoverview Pure formatting functions for CLI output presentation.
 */

import type { UpdateResult } from "#types/core";
import table from "text-table";

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
 * formatSubmodulePath("libs/common") // "libs/common"
 */
export function formatSubmodulePath(path: string): string {
  return path;
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

  // Prepare table data with header
  const tableData: string[][] = [
    ["Path", "Status", "Source", "SHA", "Duration"],
  ];

  // Add data rows without colors for proper alignment
  for (const result of results) {
    const statusIcon = formatStatusIcon(result.status);
    const statusText = result.status;
    const statusWithSymbol = `${statusIcon} ${statusText}`;

    const source = result.selection?.source ?? "-";
    const sha = result.selection
      ? formatGitHash(result.selection.sha, true)
      : "-";
    const duration = formatDuration(result.duration);

    tableData.push([
      result.submodule.path,
      statusWithSymbol,
      source,
      sha,
      duration,
    ]);
  }

  // Create borderless table with proper alignment
  return table(tableData, {
    align: ["l", "l", "l", "l", "r"], // left-align most columns, right-align duration
  });
}

/**
 * Formats a status icon based on submodule processing result.
 *
 * @param status Submodule processing status.
 * @returns Text icon representing the status.
 * @example
 * formatStatusIcon("updated") // "+"
 * formatStatusIcon("up-to-date") // "="
 * formatStatusIcon("failed") // "x"
 */
export function formatStatusIcon(
  status: "updated" | "up-to-date" | "skipped" | "failed",
): string {
  switch (status) {
    case "updated":
      return "+";
    case "up-to-date":
      return "=";
    case "skipped":
      return "-";
    case "failed":
      return "x";
    default:
      return "?";
  }
}

/**
 * Formats aggregate statistics for a batch of update results.
 *
 * @param results Array of submodule update results.
 * @returns Formatted statistics string.
 * @example
 * formatStatistics(results) // "3 updated, 1 up-to-date, 1 skipped, 1 failed (total: 6)"
 */
export function formatStatistics(results: UpdateResult[]): string {
  const counts = {
    updated: 0,
    upToDate: 0,
    skipped: 0,
    failed: 0,
  };

  for (const result of results) {
    if (result.status === "up-to-date") {
      counts.upToDate++;
    } else {
      counts[result.status]++;
    }
  }

  const parts: string[] = [];
  if (counts.updated > 0) parts.push(`${counts.updated} updated`);
  if (counts.upToDate > 0) parts.push(`${counts.upToDate} up-to-date`);
  if (counts.skipped > 0) parts.push(`${counts.skipped} skipped`);
  if (counts.failed > 0) parts.push(`${counts.failed} failed`);

  const summary = parts.join(", ");
  return `${summary} (total: ${results.length})`;
}
