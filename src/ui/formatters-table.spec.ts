/**
 * @fileoverview Unit tests for formatSummaryTable function.
 *
 * Tests the complex table formatting functionality with various input scenarios
 * to ensure consistent and correct tabular output formatting.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { formatSummaryTable } from "./formatters.js";
import type { UpdateResult, Submodule, CommitSelection } from "#types/core";

describe("formatters - table formatting", () => {
  const createSubmodule = (name: string, path: string): Submodule => ({
    name,
    path,
    branch: "main",
  });

  const createSelection = (
    sha: string,
    source: "local" | "remote",
  ): CommitSelection => ({
    sha,
    source,
    reason: "Test reason",
  });

  const createResult = (
    submodule: Submodule,
    status: "updated" | "skipped" | "failed",
    selection: CommitSelection | null = null,
    duration: number = 1000,
  ): UpdateResult => ({
    submodule,
    selection,
    status,
    duration,
  });

  describe("formatSummaryTable", () => {
    void it("handles empty results", () => {
      const table = formatSummaryTable([]);
      assert.equal(table, "No submodules processed.");
    });

    void it("formats table with various results", () => {
      const results = [
        createResult(
          createSubmodule("common", "libs/common"),
          "updated",
          createSelection("abcdef1234567890", "remote"),
          1234,
        ),
        createResult(
          createSubmodule("frontend", "apps/frontend"),
          "skipped",
          null,
          100,
        ),
        createResult(
          createSubmodule("backend", "apps/backend"),
          "failed",
          null,
          5000,
        ),
      ];

      const table = formatSummaryTable(results);

      // Note: formatSummaryTable intentionally creates borderless tables
      // for cleaner CLI output. Borders are added by the wrapping UI components
      // when needed (e.g., multilineNote).

      // Verify table headers
      assert.ok(table.includes("Path"), "Table should have Path column");
      assert.ok(table.includes("Status"), "Table should have Status column");
      assert.ok(table.includes("Source"), "Table should have Source column");
      assert.ok(table.includes("SHA"), "Table should have SHA column");
      assert.ok(
        table.includes("Duration"),
        "Table should have Duration column",
      );

      // Verify data rows
      assert.ok(table.includes("libs/common"), "Should include first path");
      assert.ok(table.includes("apps/frontend"), "Should include second path");
      assert.ok(table.includes("apps/backend"), "Should include third path");
      assert.ok(table.includes("updated"), "Should include updated status");
      assert.ok(table.includes("skipped"), "Should include skipped status");
      assert.ok(table.includes("failed"), "Should include failed status");
      assert.ok(table.includes("remote"), "Should include remote source");
      assert.ok(table.includes("abcdef1"), "Should include abbreviated hash");
      assert.ok(table.includes("1.2s"), "Should include formatted duration");
    });

    void it("adjusts column widths based on content", () => {
      const results = [
        createResult(
          createSubmodule(
            "very-long-submodule-name",
            "very/long/path/to/submodule",
          ),
          "updated",
          createSelection("abcdef1234567890", "local"),
          1000,
        ),
      ];

      const table = formatSummaryTable(results);
      assert.ok(
        table.includes("very/long/path/to/submodule"),
        "Should accommodate long paths",
      );
    });
  });
});
