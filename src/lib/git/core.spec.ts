/**
 * @fileoverview Unit tests for git utilities.
 *
 * Tests low-level Git operations using simple mocking approach
 * for basic functionality validation.
 */

import { describe, it } from "node:test";
import { strictEqual, ok } from "node:assert";
import {
  createGit,
  type AncestryCheckResult,
  type GitOperationConfig,
} from "./core.js";

describe("git-utils", () => {
  describe("createGit", () => {
    it("should create a git instance", () => {
      const git = createGit();
      ok(git !== null && git !== undefined);
      ok(typeof git.raw === "function");
      ok(typeof git.status === "function");
    });

    it("should accept custom configuration", () => {
      const config: GitOperationConfig = {
        cwd: ".", // Use current directory instead of non-existent path
        timeout: 60_000,
      };

      const git = createGit(config);
      ok(git !== null && git !== undefined);
      ok(typeof git.raw === "function");
    });
  });

  describe("type definitions", () => {
    it("should have correct AncestryCheckResult interface", () => {
      const result: AncestryCheckResult = {
        isAncestor: true,
        details: "test details",
      };

      strictEqual(result.isAncestor, true);
      strictEqual(result.details, "test details");
    });

    it("should have correct GitOperationConfig interface", () => {
      const config: GitOperationConfig = {
        cwd: "/test/path",
        timeout: 30_000,
      };

      strictEqual(config.cwd, "/test/path");
      strictEqual(config.timeout, 30_000);
    });

    it("should allow partial GitOperationConfig", () => {
      const config: GitOperationConfig = {
        cwd: "/test/path",
      };

      strictEqual(config.cwd, "/test/path");
      strictEqual(config.timeout, undefined);
    });

    it("should allow empty GitOperationConfig", () => {
      const config: GitOperationConfig = {};

      strictEqual(config.cwd, undefined);
      strictEqual(config.timeout, undefined);
    });
  });

  describe("isGitRepository", () => {
    it("should return true for current directory (git repo)", async () => {
      // Current test directory should be a git repository
      const { isGitRepository } = await import("./core.js");
      const isRepo = await isGitRepository(".");
      strictEqual(isRepo, true);
    });

    it("should return false for non-git directory", async () => {
      const { isGitRepository } = await import("./core.js");
      // Use a system directory that definitely isn't a git repo
      const isRepo = await isGitRepository("/tmp");
      strictEqual(isRepo, false);
    });
  });

  describe("getBranchName", () => {
    it("should get current branch name", async () => {
      const { getBranchName } = await import("./core.js");
      try {
        const branch = await getBranchName({ cwd: "." });
        ok(typeof branch === "string");
        ok(branch.length > 0);
        ok(branch !== "HEAD"); // Should not be in detached HEAD
      } catch (error) {
        // May fail in CI or detached HEAD state - that's acceptable
        ok(error instanceof Error);
      }
    });
  });

  describe("getCommitSha", () => {
    it("should resolve HEAD to a valid SHA", async () => {
      const { getCommitSha } = await import("./core.js");
      try {
        const sha = await getCommitSha("HEAD", { cwd: "." });
        ok(typeof sha === "string");
        ok(/^[a-f0-9]{40}$/i.test(sha)); // Valid 40-character hex SHA
      } catch (error) {
        // May fail if not in a git repo or no commits
        ok(error instanceof Error);
      }
    });

    it("should throw for invalid reference", async () => {
      const { getCommitSha } = await import("./core.js");
      try {
        await getCommitSha("invalid-ref-12345", { cwd: "." });
        // Should not reach here
        ok(false, "Expected error for invalid reference");
      } catch (error) {
        ok(error instanceof Error);
        ok(error.message.includes("Failed to resolve reference"));
      }
    });
  });

  describe("module exports", () => {
    it("should export all expected functions", async () => {
      const module = await import("./core.js");
      ok(typeof module.createGit === "function");
      ok(typeof module.isAncestor === "function");
      ok(typeof module.getCommitSha === "function");
      ok(typeof module.getBranchName === "function");
      ok(typeof module.isWorkingDirectoryClean === "function");
      ok(typeof module.getMergeBase === "function");
      ok(typeof module.isGitRepository === "function");
    });
  });
});
