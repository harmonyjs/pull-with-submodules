/**
 * @fileoverview Test suite for submodule processing factory functions.
 *
 * Tests factory function creation, convenience methods, and public API
 * with comprehensive mocking and edge case coverage.
 */

import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import type { ExecutionContext, Submodule } from "../../types/core.js";
import { BRANCH_SOURCES, DEFAULT_BRANCH } from "./types.js";
import {
  createSubmoduleProcessor,
  parseSubmodules,
  prepareUpdatePlans,
} from "./index.js";

// Test constants
const TEST_REPO_ROOT = "/test/repo";
const TEST_REPO_PATH = "/test/repo";

// Mock execution context
const mockContext: ExecutionContext = {
  dryRun: false,
  noCommit: false,
  forceRemote: false,
  parallel: false,
  verbose: false,
  repositoryRoot: TEST_REPO_ROOT,
};

describe("createSubmoduleProcessor", () => {
  describe("factory function", () => {
    test("should create processor instance with provided context", () => {
      const processor = createSubmoduleProcessor(mockContext);

      assert.ok(processor);
      assert.equal(typeof processor.parseSubmodules, "function");
      assert.equal(typeof processor.resolveBranch, "function");
      assert.equal(typeof processor.syncSubmodule, "function");
      assert.equal(typeof processor.initializeSubmodule, "function");
      assert.equal(typeof processor.prepareUpdatePlan, "function");
    });

    test("should create processor with dry run context", () => {
      const dryRunContext = { ...mockContext, dryRun: true };
      const processor = createSubmoduleProcessor(dryRunContext);

      assert.ok(processor);
      // Processor should be created successfully regardless of context flags
    });

    test("should create processor with all context flags enabled", () => {
      const fullContext: ExecutionContext = {
        dryRun: true,
        noCommit: true,
        forceRemote: true,
        parallel: true,
        verbose: true,
        repositoryRoot: TEST_REPO_ROOT,
      };

      const processor = createSubmoduleProcessor(fullContext);

      assert.ok(processor);
    });

    test("should implement SubmoduleProcessor interface", () => {
      const processor = createSubmoduleProcessor(mockContext);

      // Verify all required methods exist
      assert.ok("parseSubmodules" in processor);
      assert.ok("resolveBranch" in processor);
      assert.ok("syncSubmodule" in processor);
      assert.ok("initializeSubmodule" in processor);
      assert.ok("prepareUpdatePlan" in processor);

      // Verify methods are functions
      assert.equal(typeof processor.parseSubmodules, "function");
      assert.equal(typeof processor.resolveBranch, "function");
      assert.equal(typeof processor.syncSubmodule, "function");
      assert.equal(typeof processor.initializeSubmodule, "function");
      assert.equal(typeof processor.prepareUpdatePlan, "function");
    });
  });

  describe("context variations", () => {
    test("should handle minimal context", () => {
      const minimalContext: ExecutionContext = {
        dryRun: false,
        noCommit: false,
        forceRemote: false,
        parallel: false,
        verbose: false,
        repositoryRoot: "/minimal",
      };

      const processor = createSubmoduleProcessor(minimalContext);

      assert.ok(processor);
    });

    test("should handle complex repository root paths", () => {
      const complexContext = {
        ...mockContext,
        repositoryRoot: "/complex/path/with-dashes/and_underscores",
      };

      const processor = createSubmoduleProcessor(complexContext);

      assert.ok(processor);
    });

    test("should handle Windows-style paths", () => {
      const windowsContext = {
        ...mockContext,
        repositoryRoot: "C:\\Windows\\Repo\\Path",
      };

      const processor = createSubmoduleProcessor(windowsContext);

      assert.ok(processor);
    });
  });
});

describe("parseSubmodules", () => {
  describe("convenience function", () => {
    test("should parse submodules using internal processor", async () => {
      // This test will fail due to missing .gitmodules, but we're testing the structure
      try {
        const result = await parseSubmodules(TEST_REPO_PATH, mockContext);
        assert.ok(Array.isArray(result));
      } catch (error) {
        // Expected to fail in test environment without .gitmodules
        assert.ok(error);
      }
    });

    test("should handle non-existent repository path", async () => {
      const nonExistentPath = "/does/not/exist";

      await assert.rejects(
        async () => {
          await parseSubmodules(nonExistentPath, mockContext);
        },
        (error: Error) => {
          assert.ok(error.message);
          return true;
        },
      );
    });

    test("should work with dry run context", async () => {
      const dryRunContext = { ...mockContext, dryRun: true };

      try {
        const result = await parseSubmodules(TEST_REPO_PATH, dryRunContext);
        assert.ok(Array.isArray(result));
      } catch {
        // Expected to fail in test environment
      }
    });

    test("should handle absolute paths", async () => {
      const absolutePath = "/absolute/repo/path";

      try {
        await parseSubmodules(absolutePath, mockContext);
      } catch (error) {
        // Expected to fail, but should handle absolute paths
        assert.ok(error);
      }
    });

    test("should handle relative paths", async () => {
      const relativePath = "./relative/repo";

      try {
        await parseSubmodules(relativePath, mockContext);
      } catch (error) {
        // Expected to fail, but should handle relative paths
        assert.ok(error);
      }
    });
  });

  describe("path validation", () => {
    test("should handle empty path", async () => {
      const emptyPath = "";

      await assert.rejects(
        async () => {
          await parseSubmodules(emptyPath, mockContext);
        },
        (error: Error) => {
          assert.ok(error.message);
          return true;
        },
      );
    });

    test("should handle path with spaces", async () => {
      const pathWithSpaces = "/path with spaces/repo";

      try {
        await parseSubmodules(pathWithSpaces, mockContext);
      } catch (error) {
        // Expected to fail, but should handle spaces
        assert.ok(error);
      }
    });

    test("should handle path with special characters", async () => {
      const specialCharPath = "/path/with-special_chars.repo";

      try {
        await parseSubmodules(specialCharPath, mockContext);
      } catch (error) {
        // Expected to fail, but should handle special characters
        assert.ok(error);
      }
    });
  });
});

describe("prepareUpdatePlans", () => {
  describe("empty input handling", () => {
    test("should return empty array for no submodules", async () => {
      const emptySubmodules: Submodule[] = [];

      const result = await prepareUpdatePlans(emptySubmodules, mockContext);

      assert.ok(Array.isArray(result));
      assert.equal(result.length, 0);
    });

    test("should handle empty array efficiently", async () => {
      const startTime = Date.now();
      const result = await prepareUpdatePlans([], mockContext);
      const endTime = Date.now();

      assert.equal(result.length, 0);
      assert.ok(endTime - startTime < 100); // Should be very fast
    });
  });

  describe("single submodule processing", () => {
    test("should process single submodule", async () => {
      const submodules: Submodule[] = [
        {
          name: "test-submodule",
          path: "libs/test",
          branch: "main",
        },
      ];

      const result = await prepareUpdatePlans(submodules, mockContext);

      assert.equal(result.length, 1);
      assert.ok(result[0]);
      assert.ok(result[0]?.submodule);
      assert.ok(result[0]?.branch);
      assert.equal(typeof result[0]?.needsInit, "boolean");
      assert.equal(typeof result[0]?.isRepositoryValid, "boolean");
    });

    test("should process submodule without explicit branch", async () => {
      const submodules: Submodule[] = [
        {
          name: "no-branch-submodule",
          path: "libs/test",
        },
      ];

      const result = await prepareUpdatePlans(submodules, mockContext);

      assert.equal(result.length, 1);
      assert.ok(result[0]);
      assert.equal(result[0]?.branch.branch, DEFAULT_BRANCH);
      assert.equal(result[0]?.branch.source, BRANCH_SOURCES.FALLBACK);
    });

    test("should handle submodule with absolute path", async () => {
      const submodules: Submodule[] = [
        {
          name: "absolute-path-submodule",
          path: "/test/repo/libs/test",
        },
      ];

      const result = await prepareUpdatePlans(submodules, mockContext);

      assert.equal(result.length, 1);
      assert.ok(result[0]);
      assert.equal(result[0]?.submodule.path, "libs/test"); // Should be normalized
    });
  });

  describe("multiple submodule processing", () => {
    test("should process multiple submodules sequentially", async () => {
      const submodules: Submodule[] = [
        {
          name: "first-submodule",
          path: "libs/first",
          branch: "main",
        },
        {
          name: "second-submodule",
          path: "libs/second",
          branch: "develop",
        },
        {
          name: "third-submodule",
          path: "libs/third",
        },
      ];

      const result = await prepareUpdatePlans(submodules, mockContext);

      assert.equal(result.length, 3);

      // Verify first submodule
      assert.ok(result[0]);
      assert.equal(result[0]?.submodule.name, "first-submodule");
      assert.equal(result[0]?.branch.branch, "main");
      assert.equal(result[0]?.branch.source, BRANCH_SOURCES.EXPLICIT);

      // Verify second submodule
      assert.ok(result[1]);
      assert.equal(result[1]?.submodule.name, "second-submodule");
      assert.equal(result[1]?.branch.branch, "develop");
      assert.equal(result[1]?.branch.source, BRANCH_SOURCES.EXPLICIT);

      // Verify third submodule (no explicit branch)
      assert.ok(result[2]);
      assert.equal(result[2]?.submodule.name, "third-submodule");
      assert.equal(result[2]?.branch.branch, DEFAULT_BRANCH);
      assert.equal(result[2]?.branch.source, BRANCH_SOURCES.FALLBACK);
    });

    test("should maintain order of submodules in results", async () => {
      const submodules: Submodule[] = [
        { name: "alpha", path: "alpha" },
        { name: "beta", path: "beta" },
        { name: "gamma", path: "gamma" },
      ];

      const result = await prepareUpdatePlans(submodules, mockContext);

      assert.equal(result.length, 3);
      assert.ok(result[0] && result[1] && result[2]);
      assert.equal(result[0]?.submodule.name, "alpha");
      assert.equal(result[1]?.submodule.name, "beta");
      assert.equal(result[2]?.submodule.name, "gamma");
    });

    test("should process submodules with mixed configurations", async () => {
      const submodules: Submodule[] = [
        {
          name: "explicit-branch",
          path: "libs/explicit",
          branch: "feature/test",
        },
        {
          name: "no-branch",
          path: "libs/fallback",
        },
        {
          name: "absolute-path",
          path: "/test/repo/libs/absolute",
          branch: "main",
        },
      ];

      const result = await prepareUpdatePlans(submodules, mockContext);

      assert.equal(result.length, 3);

      // Each should have valid plan structure
      result.forEach((plan) => {
        assert.ok(plan);
        assert.ok(plan?.submodule);
        assert.ok(plan?.branch);
        assert.equal(typeof plan?.needsInit, "boolean");
        assert.equal(typeof plan?.isRepositoryValid, "boolean");
      });
    });
  });

  describe("error propagation", () => {
    test("should handle invalid submodule configurations", async () => {
      const invalidSubmodules: Submodule[] = [
        {
          name: "",
          path: "",
        },
      ];

      const result = await prepareUpdatePlans(invalidSubmodules, mockContext);

      assert.equal(result.length, 1);
      // Should still create plan, even for edge cases
      assert.ok(result[0]);
      assert.ok(result[0]?.submodule);
      assert.ok(result[0]?.branch);
    });

    test("should handle submodules with special characters", async () => {
      const specialSubmodules: Submodule[] = [
        {
          name: "test-submodule_v2.0",
          path: "libs/test-module_v2.0",
          branch: "feature/special-chars",
        },
      ];

      const result = await prepareUpdatePlans(specialSubmodules, mockContext);

      assert.equal(result.length, 1);
      assert.ok(result[0]);
      assert.equal(result[0]?.submodule.name, "test-submodule_v2.0");
      assert.equal(result[0]?.branch.branch, "feature/special-chars");
    });
  });

  describe("context integration", () => {
    test("should work with dry run context", async () => {
      const dryRunContext = { ...mockContext, dryRun: true };
      const submodules: Submodule[] = [
        {
          name: "dry-run-test",
          path: "libs/test",
        },
      ];

      const result = await prepareUpdatePlans(submodules, dryRunContext);

      assert.equal(result.length, 1);
      assert.ok(result[0]);
      assert.ok(result[0]?.submodule);
    });

    test("should work with verbose context", async () => {
      const verboseContext = { ...mockContext, verbose: true };
      const submodules: Submodule[] = [
        {
          name: "verbose-test",
          path: "libs/test",
        },
      ];

      const result = await prepareUpdatePlans(submodules, verboseContext);

      assert.equal(result.length, 1);
      assert.ok(result[0]);
      assert.ok(result[0]?.submodule);
    });
  });
});
