/**
 * @fileoverview Test suite for submodule path normalization utilities.
 *
 * Tests path resolution, normalization, and cross-platform compatibility
 * with various path formats and edge cases.
 */

import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { sep as pathSep } from "node:path";
import type { ExecutionContext, Submodule } from "#types/core";
import { resolveSubmodulePaths, toGitRelativePath } from "./paths.js";

// Test constants
const TEST_REPO_ROOT = "/test/repo";
const WINDOWS_REPO_ROOT = "C:\\test\\repo";

// Mock execution context
const mockContext: ExecutionContext = {
  dryRun: false,
  noCommit: false,
  forceRemote: false,
  parallel: false,
  verbose: false,
  repositoryRoot: TEST_REPO_ROOT,
};

const windowsContext: ExecutionContext = {
  ...mockContext,
  repositoryRoot: WINDOWS_REPO_ROOT,
};

describe("resolveSubmodulePaths", () => {
  describe("relative path handling", () => {
    test("should preserve relative paths unchanged", () => {
      const submodule: Submodule = {
        name: "test-submodule",
        path: "libs/test",
      };

      const result = resolveSubmodulePaths(submodule, mockContext);

      assert.equal(result.normalizedSubmodule.path, "libs/test");
      assert.equal(result.absolutePath, "/test/repo/libs/test");
      assert.strictEqual(result.normalizedSubmodule, submodule); // Should be same object
    });

    test("should handle nested relative paths", () => {
      const submodule: Submodule = {
        name: "nested-submodule",
        path: "vendor/third-party/deep/nested/lib",
      };

      const result = resolveSubmodulePaths(submodule, mockContext);

      assert.equal(
        result.normalizedSubmodule.path,
        "vendor/third-party/deep/nested/lib",
      );
      assert.equal(
        result.absolutePath,
        "/test/repo/vendor/third-party/deep/nested/lib",
      );
    });

    test("should handle single directory relative path", () => {
      const submodule: Submodule = {
        name: "simple",
        path: "simple",
      };

      const result = resolveSubmodulePaths(submodule, mockContext);

      assert.equal(result.normalizedSubmodule.path, "simple");
      assert.equal(result.absolutePath, "/test/repo/simple");
    });

    test("should handle relative paths with current directory reference", () => {
      const submodule: Submodule = {
        name: "current-dir",
        path: "./libs/test",
      };

      const result = resolveSubmodulePaths(submodule, mockContext);

      assert.equal(result.normalizedSubmodule.path, "./libs/test");
      assert.equal(result.absolutePath, "/test/repo/./libs/test");
    });
  });

  describe("absolute path conversion", () => {
    test("should convert absolute paths to relative", () => {
      const submodule: Submodule = {
        name: "absolute-submodule",
        path: "/test/repo/libs/test",
      };

      const result = resolveSubmodulePaths(submodule, mockContext);

      assert.equal(result.normalizedSubmodule.path, "libs/test");
      assert.equal(result.absolutePath, "/test/repo/libs/test");
      assert.notStrictEqual(result.normalizedSubmodule, submodule); // Should be new object
    });

    test("should handle absolute paths outside repository root", () => {
      const submodule: Submodule = {
        name: "external-submodule",
        path: "/different/repo/libs/test",
      };

      const result = resolveSubmodulePaths(submodule, mockContext);

      // Should create relative path even if it goes outside repo
      assert.equal(
        result.normalizedSubmodule.path,
        "../../../different/repo/libs/test",
      );
      assert.equal(
        result.absolutePath,
        "/test/repo/../../../different/repo/libs/test",
      );
    });

    test("should preserve other submodule properties during normalization", () => {
      const submodule: Submodule = {
        name: "test-submodule",
        path: "/test/repo/libs/test",
        branch: "develop",
      };

      const result = resolveSubmodulePaths(submodule, mockContext);

      assert.equal(result.normalizedSubmodule.name, "test-submodule");
      assert.equal(result.normalizedSubmodule.path, "libs/test");
      assert.equal(result.normalizedSubmodule.branch, "develop");
    });
  });

  describe("cross-platform compatibility", () => {
    test("should handle Windows absolute paths", () => {
      const submodule: Submodule = {
        name: "windows-submodule",
        path: "C:\\test\\repo\\libs\\test",
      };

      const result = resolveSubmodulePaths(submodule, windowsContext);

      assert.equal(result.normalizedSubmodule.path, "libs\\test");
      assert.equal(result.absolutePath, "C:\\test\\repo\\libs\\test");
    });

    test("should handle mixed path separators", () => {
      const submodule: Submodule = {
        name: "mixed-separators",
        path: "libs/nested\\subdir/test",
      };

      const result = resolveSubmodulePaths(submodule, mockContext);

      assert.equal(result.normalizedSubmodule.path, "libs/nested\\subdir/test");
      assert.equal(result.absolutePath, "/test/repo/libs/nested\\subdir/test");
    });
  });

  describe("edge cases", () => {
    test("should handle empty path", () => {
      const submodule: Submodule = {
        name: "empty-path",
        path: "",
      };

      const result = resolveSubmodulePaths(submodule, mockContext);

      assert.equal(result.normalizedSubmodule.path, "");
      assert.equal(result.absolutePath, "/test/repo");
    });

    test("should handle root path", () => {
      const submodule: Submodule = {
        name: "root-path",
        path: "/",
      };

      const result = resolveSubmodulePaths(submodule, mockContext);

      // Should create relative path to root
      assert.ok(result.normalizedSubmodule.path.includes(".."));
      assert.equal(
        result.absolutePath,
        "/test/repo/" + result.normalizedSubmodule.path,
      );
    });

    test("should handle paths with special characters", () => {
      const submodule: Submodule = {
        name: "special-chars",
        path: "libs/test-module_v2.0",
      };

      const result = resolveSubmodulePaths(submodule, mockContext);

      assert.equal(result.normalizedSubmodule.path, "libs/test-module_v2.0");
      assert.equal(result.absolutePath, "/test/repo/libs/test-module_v2.0");
    });

    test("should handle paths with spaces", () => {
      const submodule: Submodule = {
        name: "spaces-path",
        path: "libs/test module",
      };

      const result = resolveSubmodulePaths(submodule, mockContext);

      assert.equal(result.normalizedSubmodule.path, "libs/test module");
      assert.equal(result.absolutePath, "/test/repo/libs/test module");
    });
  });

  describe("repository root variations", () => {
    test("should handle repository root with trailing slash", () => {
      const contextWithTrailingSlash = {
        ...mockContext,
        repositoryRoot: "/test/repo/",
      };

      const submodule: Submodule = {
        name: "test",
        path: "libs/test",
      };

      const result = resolveSubmodulePaths(submodule, contextWithTrailingSlash);

      assert.equal(result.absolutePath, "/test/repo/libs/test");
    });

    test("should handle relative repository root", () => {
      const contextWithRelativeRoot = {
        ...mockContext,
        repositoryRoot: "./repo",
      };

      const submodule: Submodule = {
        name: "test",
        path: "libs/test",
      };

      const result = resolveSubmodulePaths(submodule, contextWithRelativeRoot);

      assert.equal(result.absolutePath, "./repo/libs/test");
    });
  });
});

describe("toGitRelativePath", () => {
  describe("basic path conversion", () => {
    test("should convert Unix paths correctly", () => {
      const repositoryRoot = "/test/repo";
      const absolutePath = "/test/repo/libs/test";

      const result = toGitRelativePath(repositoryRoot, absolutePath);

      assert.equal(result, "libs/test");
    });

    test("should handle nested paths", () => {
      const repositoryRoot = "/test/repo";
      const absolutePath = "/test/repo/vendor/third-party/deep/nested";

      const result = toGitRelativePath(repositoryRoot, absolutePath);

      assert.equal(result, "vendor/third-party/deep/nested");
    });

    test("should handle paths outside repository", () => {
      const repositoryRoot = "/test/repo";
      const absolutePath = "/test/other/path";

      const result = toGitRelativePath(repositoryRoot, absolutePath);

      assert.equal(result, "../other/path");
    });
  });

  describe("cross-platform path separators", () => {
    test("should convert Windows backslashes to forward slashes", () => {
      // Mock Windows environment
      if (pathSep === "\\") {
        // Running on Windows - test actual conversion
        const repositoryRoot = "C:\\test\\repo";
        const absolutePath = "C:\\test\\repo\\libs\\test";

        const result = toGitRelativePath(repositoryRoot, absolutePath);

        assert.equal(result, "libs/test");
        assert.ok(
          !result.includes("\\"),
          "Result should not contain backslashes",
        );
      } else {
        // Running on Unix - simulate Windows behavior
        const repositoryRoot = "/test/repo";
        const absolutePath = "/test/repo/libs/test";

        const result = toGitRelativePath(repositoryRoot, absolutePath);

        assert.equal(result, "libs/test");
        assert.ok(
          result.includes("/"),
          "Result should contain forward slashes",
        );
      }
    });

    test("should handle mixed separators correctly", () => {
      const repositoryRoot = "/test/repo";
      const absolutePath = "/test/repo/libs/nested\\mixed/path";

      const result = toGitRelativePath(repositoryRoot, absolutePath);

      // Should preserve the mixed separators as-is on Unix
      if (pathSep === "/") {
        assert.equal(result, "libs/nested\\mixed/path");
      } else {
        // On Windows, would convert all to forward slashes
        assert.equal(result, "libs/nested/mixed/path");
      }
    });
  });

  describe("edge cases", () => {
    test("should handle same path as repository root", () => {
      const repositoryRoot = "/test/repo";
      const absolutePath = "/test/repo";

      const result = toGitRelativePath(repositoryRoot, absolutePath);

      assert.equal(result, "");
    });

    test("should handle empty paths", () => {
      const repositoryRoot = "/test/repo";
      const absolutePath = "";

      const result = toGitRelativePath(repositoryRoot, absolutePath);

      assert.ok(typeof result === "string");
    });

    test("should handle paths with special characters", () => {
      const repositoryRoot = "/test/repo";
      const absolutePath = "/test/repo/libs/test-module_v2.0";

      const result = toGitRelativePath(repositoryRoot, absolutePath);

      assert.equal(result, "libs/test-module_v2.0");
    });

    test("should handle paths with spaces", () => {
      const repositoryRoot = "/test/repo";
      const absolutePath = "/test/repo/libs/test module";

      const result = toGitRelativePath(repositoryRoot, absolutePath);

      assert.equal(result, "libs/test module");
    });

    test("should handle unicode characters", () => {
      const repositoryRoot = "/test/repo";
      const absolutePath = "/test/repo/libs/tëst-mødüle";

      const result = toGitRelativePath(repositoryRoot, absolutePath);

      assert.equal(result, "libs/tëst-mødüle");
    });
  });

  describe("repository root variations", () => {
    test("should handle repository root with trailing slash", () => {
      const repositoryRoot = "/test/repo/";
      const absolutePath = "/test/repo/libs/test";

      const result = toGitRelativePath(repositoryRoot, absolutePath);

      assert.equal(result, "libs/test");
    });

    test("should handle repository root without trailing slash", () => {
      const repositoryRoot = "/test/repo";
      const absolutePath = "/test/repo/libs/test";

      const result = toGitRelativePath(repositoryRoot, absolutePath);

      assert.equal(result, "libs/test");
    });

    test("should normalize consecutive slashes", () => {
      const repositoryRoot = "/test//repo";
      const absolutePath = "/test//repo//libs//test";

      const result = toGitRelativePath(repositoryRoot, absolutePath);

      // Node.js path.relative should handle this normalization
      assert.ok(
        !result.includes("//"),
        "Result should not contain consecutive slashes",
      );
    });
  });
});
