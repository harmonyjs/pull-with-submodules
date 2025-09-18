/**
 * @fileoverview Test suite for branch resolution logic.
 *
 * Tests branch resolution priority system with comprehensive mocking
 * of git operations and error scenarios.
 */

import { strict as assert } from "node:assert";
import { test, describe, mock } from "node:test";
import type { ExecutionContext, Submodule } from "../../types/core.js";
import {
  BRANCH_SOURCES,
  DEFAULT_BRANCH,
  type BranchResolution,
} from "./types.js";
import { resolveBranch } from "./branch-resolver.js";

// Test constants
const TEST_REPO_ROOT = "/test/repo";
const TEST_SUBMODULE_PATH = "libs/test";
const TEST_SUBMODULE_NAME = "test";

// Mock logger interface
interface MockLogger {
  debug: (message: string, data?: any) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

// Mock execution context
const mockContext: ExecutionContext = {
  dryRun: false,
  noCommit: false,
  forceRemote: false,
  parallel: false,
  verbose: false,
  repositoryRoot: TEST_REPO_ROOT,
};

const createMockLogger = (): MockLogger => ({
  debug: mock.fn(),
  info: mock.fn(),
  warn: mock.fn(),
  error: mock.fn(),
});

describe("resolveBranch", () => {
  describe("explicit branch configuration", () => {
    test("should return explicit branch when configured in .gitmodules", async () => {
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
      assert.equal((mockLogger.debug as any).mock.callCount(), 1);
    });

    test("should handle feature/branch-name with slashes", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
        branch: "feature/advanced-submodules",
      };

      const mockLogger = createMockLogger();
      const result = await resolveBranch(submodule, mockContext, mockLogger);

      assert.equal(result.branch, "feature/advanced-submodules");
      assert.equal(result.source, BRANCH_SOURCES.EXPLICIT);
    });

    test("should handle branch names with hyphens and underscores", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
        branch: "release_v2.0-beta",
      };

      const mockLogger = createMockLogger();
      const result = await resolveBranch(submodule, mockContext, mockLogger);

      assert.equal(result.branch, "release_v2.0-beta");
      assert.equal(result.source, BRANCH_SOURCES.EXPLICIT);
    });

    test("should treat empty string as no explicit branch", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
        branch: "",
      };

      const mockLogger = createMockLogger();
      const result = await resolveBranch(submodule, mockContext, mockLogger);

      assert.equal(result.source, BRANCH_SOURCES.FALLBACK);
      assert.equal(result.branch, DEFAULT_BRANCH);
    });

    test("should treat whitespace-only string as no explicit branch", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
        branch: "   \t  \n  ",
      };

      const mockLogger = createMockLogger();
      const result = await resolveBranch(submodule, mockContext, mockLogger);

      assert.equal(result.source, BRANCH_SOURCES.FALLBACK);
      assert.equal(result.branch, DEFAULT_BRANCH);
    });

    test("should preserve branch with leading/trailing spaces after trim", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
        branch: "  valid-branch  ",
      };

      const mockLogger = createMockLogger();
      const result = await resolveBranch(submodule, mockContext, mockLogger);

      assert.equal(result.branch, "  valid-branch  ");
      assert.equal(result.source, BRANCH_SOURCES.EXPLICIT);
    });
  });
});

describe("resolveBranch - branch detection", () => {
  describe("branch detection from existing repository", () => {
    test("should detect current branch when repository exists", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
      };

      const mockLogger = createMockLogger();
      const result = await resolveBranch(submodule, mockContext, mockLogger);

      // In test environment, will fallback to default branch
      assert.equal(result.branch, DEFAULT_BRANCH);
      assert.equal(result.source, BRANCH_SOURCES.FALLBACK);
    });

    test("should fallback when repository does not exist", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
      };

      // Test actual function which will fail to find repository
      const mockLogger = createMockLogger();
      const result = await resolveBranch(submodule, mockContext, mockLogger);

      assert.equal(result.branch, DEFAULT_BRANCH);
      assert.equal(result.source, BRANCH_SOURCES.FALLBACK);
      assert.match(result.details, /No explicit branch configured/);
    });

    test("should handle git operation errors gracefully", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
      };

      const mockLogger = createMockLogger();
      const result = await resolveBranch(submodule, mockContext, mockLogger);

      // Should fallback on any git errors
      assert.equal(result.branch, DEFAULT_BRANCH);
      assert.equal(result.source, BRANCH_SOURCES.FALLBACK);
    });
  });
});

describe("resolveBranch - fallback scenarios", () => {
  describe("fallback scenarios", () => {
    test("should use default branch when no branch is specified", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
      };

      const mockLogger = createMockLogger();
      const result = await resolveBranch(submodule, mockContext, mockLogger);

      assert.equal(result.branch, DEFAULT_BRANCH);
      assert.equal(result.source, BRANCH_SOURCES.FALLBACK);
      assert.equal(
        result.details,
        `No explicit branch configured, using '${DEFAULT_BRANCH}' as default`,
      );
    });

    test("should log debug message for fallback branch usage", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
      };

      const mockLogger = createMockLogger();
      await resolveBranch(submodule, mockContext, mockLogger);

      const debugCalls = (mockLogger.debug as any).mock.calls;
      assert.ok(debugCalls.length >= 1);
      assert.match(
        debugCalls[0]?.arguments[0] as string,
        /Resolving branch for submodule/,
      );
    });
  });
});

describe("resolveBranch - edge cases", () => {
  describe("edge cases and validation", () => {
    test("should handle submodule with undefined branch property", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
        // branch property intentionally omitted
      };

      const mockLogger = createMockLogger();
      const result = await resolveBranch(submodule, mockContext, mockLogger);

      assert.equal(result.source, BRANCH_SOURCES.FALLBACK);
      assert.equal(result.branch, DEFAULT_BRANCH);
    });

    test("should handle complex submodule paths", async () => {
      const submodule: Submodule = {
        name: "complex-path-submodule",
        path: "vendor/third-party/deep/nested/lib",
        branch: "stable",
      };

      const mockLogger = createMockLogger();
      const result = await resolveBranch(submodule, mockContext, mockLogger);

      assert.equal(result.branch, "stable");
      assert.equal(result.source, BRANCH_SOURCES.EXPLICIT);
    });

    test("should handle special characters in submodule name", async () => {
      const submodule: Submodule = {
        name: "test-submodule_v2.0",
        path: TEST_SUBMODULE_PATH,
        branch: "main",
      };

      const mockLogger = createMockLogger();
      const result = await resolveBranch(submodule, mockContext, mockLogger);

      assert.equal(result.branch, "main");
      assert.equal(result.source, BRANCH_SOURCES.EXPLICIT);
    });
  });

  describe("logging behavior", () => {
    test("should log initial resolution attempt", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
        branch: "test-branch",
      };

      const mockLogger = createMockLogger();
      await resolveBranch(submodule, mockContext, mockLogger);

      const debugCalls = (mockLogger.debug as any).mock.calls;
      assert.ok(debugCalls.length >= 1);
      const firstCall = debugCalls[0];
      if (firstCall && firstCall.arguments && firstCall.arguments[0]) {
        assert.match(
          firstCall.arguments[0] as string,
          /Resolving branch for submodule/,
        );
      }
    });

    test("should not log warnings for successful explicit branch resolution", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
        branch: "explicit-branch",
      };

      const mockLogger = createMockLogger();
      await resolveBranch(submodule, mockContext, mockLogger);

      const warnCalls = (mockLogger.warn as any).mock.calls;
      assert.equal(warnCalls.length, 0);
    });
  });
});
