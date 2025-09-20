/**
 * @fileoverview Test suite for submodule processor implementation.
 *
 * Tests all methods of SubmoduleProcessorImpl with comprehensive mocking
 * using dependency injection pattern instead of module mocking.
 */

import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import type { ExecutionContext, Submodule } from "#types/core";
import {
  BRANCH_SOURCES,
  DEFAULT_BRANCH,
  type BranchResolution,
} from "./types.js";
import { resolveBranch } from "./branch-resolver.js";
import { SubmoduleProcessorImpl } from "./processor.js";
import { normalizeSubmoduleEntry } from "./helpers.js";

// Test constants
const TEST_REPO_ROOT = "/test/repo";
const TEST_SUBMODULE_PATH = "libs/test";
const TEST_SUBMODULE_NAME = "test";

// Mock dependencies interfaces for testing
interface MockLogger {
  debug: (message: string, data?: any) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

describe("SubmoduleProcessorImpl", () => {
  const mockContext: ExecutionContext = {
    dryRun: false,
    noCommit: false,
    forceRemote: false,
    parallel: false,
    verbose: false,
    repositoryRoot: TEST_REPO_ROOT,
  };

  const createMockLogger = (): MockLogger => ({
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  });

  describe("resolveBranch", () => {
    test("should return explicit branch when configured", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
        branch: "develop",
      };

      const mockLogger = createMockLogger();
      const result = await resolveBranch(submodule, mockContext, mockLogger);

      const expected: BranchResolution = {
        branch: "develop",
        source: BRANCH_SOURCES.EXPLICIT,
        details: "Explicit branch configured in .gitmodules",
      };

      assert.deepEqual(result, expected);
    });

    test("should fallback to default when no explicit branch", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
      };

      const mockLogger = createMockLogger();
      const result = await resolveBranch(submodule, mockContext, mockLogger);

      assert.equal(result.branch, DEFAULT_BRANCH);
      assert.equal(result.source, BRANCH_SOURCES.FALLBACK);
      assert.match(result.details, /No explicit branch configured/);
    });

    test("should handle empty branch string as no explicit branch", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
        branch: "   ", // Whitespace only
      };

      const mockLogger = createMockLogger();
      const result = await resolveBranch(submodule, mockContext, mockLogger);

      assert.equal(result.source, BRANCH_SOURCES.FALLBACK);
      assert.equal(result.branch, DEFAULT_BRANCH);
    });
  });

  describe("syncSubmodule - dry run", () => {
    test("should handle dry-run mode", async () => {
      const dryRunContext = { ...mockContext, dryRun: true };
      const mockLogger = createMockLogger();
      let infoMessage = "";
      mockLogger.info = (message: string) => {
        infoMessage = message;
      };

      // Create a testable processor that accepts a custom logger
      const processor = new SubmoduleProcessorImpl(dryRunContext);
      (processor as any).logger = mockLogger;

      await processor.syncSubmodule(`${TEST_REPO_ROOT}/${TEST_SUBMODULE_PATH}`);

      assert.match(infoMessage, /Would sync submodule/);
    });
  });

  describe("initializeSubmodule - dry run", () => {
    test("should handle dry-run mode", async () => {
      const dryRunContext = { ...mockContext, dryRun: true };
      const mockLogger = createMockLogger();
      let infoMessage = "";
      mockLogger.info = (message: string) => {
        infoMessage = message;
      };

      // Create a testable processor that accepts a custom logger
      const processor = new SubmoduleProcessorImpl(dryRunContext);
      (processor as any).logger = mockLogger;

      await processor.initializeSubmodule(
        `${TEST_REPO_ROOT}/${TEST_SUBMODULE_PATH}`,
      );

      assert.match(infoMessage, /Would initialize submodule/);
    });
  });

  describe("prepareUpdatePlan", () => {
    test("should create plan with proper structure", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
        branch: "main",
      };

      const processor = new SubmoduleProcessorImpl(mockContext);
      const result = await processor.prepareUpdatePlan(submodule);

      // Verify structure
      assert.ok(result.submodule);
      assert.ok(result.branch);
      assert.equal(typeof result.needsInit, "boolean");
      assert.equal(typeof result.isRepositoryValid, "boolean");
      assert.equal(result.submodule.name, TEST_SUBMODULE_NAME);
      assert.equal(result.branch.branch, "main");
      assert.equal(result.branch.source, BRANCH_SOURCES.EXPLICIT);
    });
  });

  describe("normalization", () => {
    test("should normalize submodule entries correctly", () => {
      const mockEntries = [
        {
          name: "test-submodule",
          path: TEST_SUBMODULE_PATH,
          url: "https://github.com/test/test.git",
          branch: "main",
        },
        {
          name: "other-submodule",
          path: "libs/other",
          url: "https://github.com/test/other.git",
        },
      ];

      // Test the normalization logic
      const testEntries = mockEntries.map((entry) =>
        normalizeSubmoduleEntry(entry),
      );

      assert.equal(testEntries.length, 2);
      assert.deepEqual(testEntries[0], {
        name: "test-submodule",
        path: TEST_SUBMODULE_PATH,
        branch: "main",
      });
      assert.deepEqual(testEntries[1], {
        name: "other-submodule",
        path: "libs/other",
      });
    });
  });

  describe("constants", () => {
    test("should have correct branch sources", () => {
      assert.equal(BRANCH_SOURCES.EXPLICIT, "explicit");
      assert.equal(BRANCH_SOURCES.DETECTED, "detected");
      assert.equal(BRANCH_SOURCES.FALLBACK, "fallback");
    });

    test("should have correct default branch", () => {
      assert.equal(DEFAULT_BRANCH, "main");
    });
  });
});
