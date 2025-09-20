/**
 * @fileoverview Unit tests for basic formatting functions.
 *
 * Tests for duration, git hash, path, status icon, and statistics formatting.
 * These are simpler, pure functions with straightforward test cases.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  formatDuration,
  formatGitHash,
  formatSubmodulePath,
  formatStatusIcon,
  formatStatistics,
} from "./formatters.js";
import type { UpdateResult, CommitSelection } from "#types/core";

describe("formatters - basic functions", () => {
  describe("formatDuration", () => {
    void it("formats milliseconds under 1000ms", () => {
      assert.equal(formatDuration(500), "500ms");
      assert.equal(formatDuration(999), "999ms");
    });

    void it("formats seconds", () => {
      assert.equal(formatDuration(1000), "1.0s");
      assert.equal(formatDuration(1234), "1.2s");
      assert.equal(formatDuration(59900), "59.9s");
    });

    void it("formats minutes and seconds", () => {
      assert.equal(formatDuration(60000), "1m 0s");
      assert.equal(formatDuration(65000), "1m 5s");
      assert.equal(formatDuration(125000), "2m 5s");
    });

    void it("formats hours, minutes, and seconds", () => {
      assert.equal(formatDuration(3600000), "1h 0m 0s");
      assert.equal(formatDuration(3665000), "1h 1m 5s");
      assert.equal(formatDuration(7323000), "2h 2m 3s");
    });
  });

  describe("formatGitHash", () => {
    const longHash = "abcdef1234567890abcdef1234567890abcdef12";

    void it("returns full hash by default", () => {
      assert.equal(formatGitHash(longHash), longHash);
      assert.equal(formatGitHash("short"), "short");
    });

    void it("abbreviates to 7 characters when short=true", () => {
      assert.equal(formatGitHash(longHash, true), "abcdef1");
      assert.equal(formatGitHash("short", true), "short");
    });

    void it("handles hashes shorter than 7 characters", () => {
      assert.equal(formatGitHash("abc", true), "abc");
      assert.equal(formatGitHash("abcdefg", true), "abcdefg");
    });
  });

  describe("formatSubmodulePath", () => {
    void it("returns path without modification", () => {
      assert.equal(formatSubmodulePath("libs/common"), "libs/common");
      assert.equal(formatSubmodulePath("apps/frontend"), "apps/frontend");
      assert.equal(formatSubmodulePath("src"), "src");
    });
  });

  describe("formatStatusIcon", () => {
    void it("returns correct icons for each status", () => {
      assert.equal(formatStatusIcon("updated"), "+");
      assert.equal(formatStatusIcon("up-to-date"), "=");
      assert.equal(formatStatusIcon("skipped"), "-");
      assert.equal(formatStatusIcon("failed"), "x");
    });
  });

  describe("formatStatistics", () => {
    const createResult = (
      path: string,
      status: "updated" | "skipped" | "failed",
      selection: CommitSelection | null = null,
    ): UpdateResult => ({
      submodule: { name: path, path, branch: "main" },
      selection,
      status,
      duration: 1000,
    });

    void it("formats statistics with all statuses", () => {
      const results = [
        createResult("lib1", "updated"),
        createResult("lib2", "updated"),
        createResult("lib3", "skipped"),
        createResult("lib4", "failed"),
      ];

      const stats = formatStatistics(results);
      assert.equal(stats, "2 updated, 1 skipped, 1 failed (total: 4)");
    });

    void it("formats statistics with only updated", () => {
      const results = [
        createResult("lib1", "updated"),
        createResult("lib2", "updated"),
      ];

      const stats = formatStatistics(results);
      assert.equal(stats, "2 updated (total: 2)");
    });

    void it("formats statistics with empty results", () => {
      const stats = formatStatistics([]);
      assert.equal(stats, " (total: 0)");
    });

    void it("omits zero counts", () => {
      const results = [
        createResult("lib1", "updated"),
        createResult("lib2", "skipped"),
      ];

      const stats = formatStatistics(results);
      assert.equal(stats, "1 updated, 1 skipped (total: 2)");
    });
  });
});
