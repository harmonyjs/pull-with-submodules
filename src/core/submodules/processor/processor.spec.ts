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
} from "#core/submodules/types";
import { resolveBranch } from "#core/submodules/branch-resolver";
import { SubmoduleProcessorImpl } from "./implementation.js";
import { normalizeSubmoduleEntry } from "#core/submodules/helpers";
import { createMockLogger, createSpyLogger } from "#test-utils";

/**
 * Type-safe helper for injecting mock logger into processor for testing.
 * Uses Reflect API to access private property safely.
 *
 * @param processor The processor instance to inject logger into
 * @param mockLogger The mock logger to inject
 */
function injectMockLogger(
  processor: SubmoduleProcessorImpl,
  mockLogger: unknown,
): void {
  // Use Reflect API to set private property safely for testing
  Reflect.set(processor, "logger", mockLogger);
}

// Test constants
const TEST_REPO_ROOT = "/test/repo";
const TEST_SUBMODULE_PATH = "libs/test";
const TEST_SUBMODULE_NAME = "test";

describe("SubmoduleProcessorImpl", () => {
  const mockContext: ExecutionContext = {
    dryRun: false,
    noCommit: false,
    forceRemote: false,
    parallel: false,
    verbose: false,
    repositoryRoot: TEST_REPO_ROOT,
  };

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
      const mockLogger = createSpyLogger("info");

      // Create a testable processor that accepts a custom logger
      const processor = new SubmoduleProcessorImpl(dryRunContext);
      injectMockLogger(processor, mockLogger);

      await processor.syncSubmodule(`${TEST_REPO_ROOT}/${TEST_SUBMODULE_PATH}`);

      // Verify the info method was called with the expected message pattern
      assert.equal(mockLogger.info.mock.callCount(), 1);
      const infoCall = mockLogger.info.mock.calls[0];
      assert.ok(infoCall?.arguments[0]);
      assert.match(infoCall.arguments[0] as string, /Would sync submodule/);
    });
  });

  describe("initializeSubmodule - dry run", () => {
    test("should handle dry-run mode", async () => {
      const dryRunContext = { ...mockContext, dryRun: true };
      const mockLogger = createSpyLogger("info");

      // Create a testable processor that accepts a custom logger
      const processor = new SubmoduleProcessorImpl(dryRunContext);
      injectMockLogger(processor, mockLogger);

      await processor.initializeSubmodule(
        `${TEST_REPO_ROOT}/${TEST_SUBMODULE_PATH}`,
      );

      // Verify the info method was called with the expected message pattern
      assert.equal(mockLogger.info.mock.callCount(), 1);
      const infoCall = mockLogger.info.mock.calls[0];
      assert.ok(infoCall?.arguments[0]);
      assert.match(
        infoCall.arguments[0] as string,
        /Would initialize submodule/,
      );
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
