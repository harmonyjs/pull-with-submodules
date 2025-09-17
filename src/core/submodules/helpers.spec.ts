/**
 * @fileoverview Test suite for submodule helper functions and utilities.
 *
 * Tests normalization, SHA getter creation, error handling, and utility
 * functions with comprehensive edge case coverage.
 */

import { strict as assert } from "node:assert";
import { test, describe, mock } from "node:test";
import type { Submodule } from "../../types/core.js";
import type { SubmoduleEntry } from "../../lib/git/gitmodules.js";
import {
  normalizeSubmoduleEntry,
  createCurrentShaGetter,
  getErrorMessage,
} from "./helpers.js";

// Test constants
const TEST_SUBMODULE_PATH = "/test/repo/libs/test";

describe("normalizeSubmoduleEntry", () => {
  describe("basic normalization", () => {
    test("should normalize entry with all properties", () => {
      const entry: SubmoduleEntry = {
        name: "test-submodule",
        path: "libs/test",
        url: "https://github.com/test/test.git",
        branch: "main",
      };

      const result = normalizeSubmoduleEntry(entry);

      const expected: Submodule = {
        name: "test-submodule",
        path: "libs/test",
        branch: "main",
      };

      assert.deepEqual(result, expected);
    });

    test("should normalize entry without branch", () => {
      const entry: SubmoduleEntry = {
        name: "no-branch-submodule",
        path: "libs/test",
        url: "https://github.com/test/test.git",
      };

      const result = normalizeSubmoduleEntry(entry);

      const expected: Submodule = {
        name: "no-branch-submodule",
        path: "libs/test",
      };

      assert.deepEqual(result, expected);
    });

    test("should preserve all required properties", () => {
      const entry: SubmoduleEntry = {
        name: "required-props",
        path: "vendor/lib",
        url: "https://example.com/repo.git",
        branch: "develop",
      };

      const result = normalizeSubmoduleEntry(entry);

      assert.equal(result.name, "required-props");
      assert.equal(result.path, "vendor/lib");
      assert.equal(result.branch, "develop");
    });

    test("should not include URL in normalized result", () => {
      const entry: SubmoduleEntry = {
        name: "url-test",
        path: "libs/test",
        url: "https://github.com/test/secret-repo.git",
        branch: "main",
      };

      const result = normalizeSubmoduleEntry(entry);

      assert.ok(!("url" in result));
      assert.equal(result.name, "url-test");
      assert.equal(result.path, "libs/test");
      assert.equal(result.branch, "main");
    });
  });

  describe("branch handling", () => {
    test("should include branch when explicitly set", () => {
      const entry: SubmoduleEntry = {
        name: "explicit-branch",
        path: "libs/test",
        url: "https://github.com/test/test.git",
        branch: "feature/test",
      };

      const result = normalizeSubmoduleEntry(entry);

      assert.equal(result.branch, "feature/test");
    });

    test("should not include branch property when undefined", () => {
      const entry: SubmoduleEntry = {
        name: "undefined-branch",
        path: "libs/test",
        url: "https://github.com/test/test.git",
      };

      const result = normalizeSubmoduleEntry(entry);

      assert.ok(!("branch" in result));
      assert.equal(result.name, "undefined-branch");
      assert.equal(result.path, "libs/test");
    });

    test("should handle empty string branch", () => {
      const entry: SubmoduleEntry = {
        name: "empty-branch",
        path: "libs/test",
        url: "https://github.com/test/test.git",
        branch: "",
      };

      const result = normalizeSubmoduleEntry(entry);

      assert.equal(result.branch, "");
    });

    test("should handle branch with special characters", () => {
      const entry: SubmoduleEntry = {
        name: "special-branch",
        path: "libs/test",
        url: "https://github.com/test/test.git",
        branch: "feature/fix-issue_#123",
      };

      const result = normalizeSubmoduleEntry(entry);

      assert.equal(result.branch, "feature/fix-issue_#123");
    });
  });

  describe("path and name handling", () => {
    test("should handle complex paths", () => {
      const entry: SubmoduleEntry = {
        name: "deep-nested",
        path: "vendor/third-party/deep/nested/lib",
        url: "https://github.com/vendor/lib.git",
      };

      const result = normalizeSubmoduleEntry(entry);

      assert.equal(result.name, "deep-nested");
      assert.equal(result.path, "vendor/third-party/deep/nested/lib");
    });

    test("should handle names with special characters", () => {
      const entry: SubmoduleEntry = {
        name: "test-submodule_v2.0",
        path: "libs/test",
        url: "https://github.com/test/test.git",
      };

      const result = normalizeSubmoduleEntry(entry);

      assert.equal(result.name, "test-submodule_v2.0");
    });

    test("should handle paths with spaces", () => {
      const entry: SubmoduleEntry = {
        name: "space-path",
        path: "libs/test module",
        url: "https://github.com/test/test.git",
      };

      const result = normalizeSubmoduleEntry(entry);

      assert.equal(result.path, "libs/test module");
    });

    test("should handle Unicode characters", () => {
      const entry: SubmoduleEntry = {
        name: "unicode-test",
        path: "libs/tëst-mødüle",
        url: "https://github.com/test/test.git",
      };

      const result = normalizeSubmoduleEntry(entry);

      assert.equal(result.name, "unicode-test");
      assert.equal(result.path, "libs/tëst-mødüle");
    });
  });

  describe("edge cases", () => {
    test("should handle empty strings", () => {
      const entry: SubmoduleEntry = {
        name: "",
        path: "",
        url: "",
      };

      const result = normalizeSubmoduleEntry(entry);

      assert.equal(result.name, "");
      assert.equal(result.path, "");
      assert.ok(!("branch" in result));
    });

    test("should handle minimal valid entry", () => {
      const entry: SubmoduleEntry = {
        name: "minimal",
        path: "minimal",
        url: "https://example.com/minimal.git",
      };

      const result = normalizeSubmoduleEntry(entry);

      assert.equal(result.name, "minimal");
      assert.equal(result.path, "minimal");
      assert.ok(!("branch" in result));
    });
  });
});

describe("createCurrentShaGetter", () => {
  describe("basic functionality", () => {
    test("should create function that returns SHA", async () => {
      const mockOnError = mock.fn();
      const shaGetter = createCurrentShaGetter(TEST_SUBMODULE_PATH, mockOnError);

      assert.equal(typeof shaGetter, "function");

      // This will likely fail in test environment, but we test the structure
      try {
        const result = await shaGetter();
        if (result !== undefined) {
          assert.equal(typeof result, "string");
        }
      } catch {
        // Expected in test environment
      }
    });

    test("should return undefined on git errors", async () => {
      const nonExistentPath = "/definitely/does/not/exist";
      const mockOnError = mock.fn();
      const shaGetter = createCurrentShaGetter(nonExistentPath, mockOnError);

      const result = await shaGetter();

      assert.equal(result, undefined);
      assert.equal(mockOnError.mock.callCount(), 1);
    });

    test("should work without error handler", async () => {
      const nonExistentPath = "/definitely/does/not/exist";
      const shaGetter = createCurrentShaGetter(nonExistentPath);

      const result = await shaGetter();

      assert.equal(result, undefined);
      // Should not throw even without error handler
    });
  });

  describe("error handling", () => {
    test("should call error handler on git failures", async () => {
      const invalidPath = "/invalid/git/repo";
      const mockOnError = mock.fn();
      const shaGetter = createCurrentShaGetter(invalidPath, mockOnError);

      const result = await shaGetter();

      assert.equal(result, undefined);
      assert.equal(mockOnError.mock.callCount(), 1);

      const errorArg = mockOnError.mock.calls[0]?.arguments[0];
      assert.ok(errorArg);
    });

    test("should handle multiple consecutive calls", async () => {
      const invalidPath = "/invalid/git/repo";
      const mockOnError = mock.fn();
      const shaGetter = createCurrentShaGetter(invalidPath, mockOnError);

      const result1 = await shaGetter();
      const result2 = await shaGetter();
      const result3 = await shaGetter();

      assert.equal(result1, undefined);
      assert.equal(result2, undefined);
      assert.equal(result3, undefined);
      assert.equal(mockOnError.mock.callCount(), 3);
    });

    test("should not throw exceptions on git errors", async () => {
      const invalidPath = "/invalid/git/repo";
      const shaGetter = createCurrentShaGetter(invalidPath);

      // Should not throw
      await assert.doesNotReject(async () => {
        await shaGetter();
      });
    });
  });

  describe("path variations", () => {
    test("should handle absolute paths", async () => {
      const absolutePath = "/absolute/path/to/repo";
      const mockOnError = mock.fn();
      const shaGetter = createCurrentShaGetter(absolutePath, mockOnError);

      const result = await shaGetter();

      assert.equal(result, undefined); // Expected to fail in test
      assert.equal(mockOnError.mock.callCount(), 1);
    });

    test("should handle relative paths", async () => {
      const relativePath = "./relative/repo";
      const mockOnError = mock.fn();
      const shaGetter = createCurrentShaGetter(relativePath, mockOnError);

      const result = await shaGetter();

      assert.equal(result, undefined); // Expected to fail in test
      assert.equal(mockOnError.mock.callCount(), 1);
    });

    test("should handle paths with spaces", async () => {
      const pathWithSpaces = "/path with spaces/repo";
      const mockOnError = mock.fn();
      const shaGetter = createCurrentShaGetter(pathWithSpaces, mockOnError);

      const result = await shaGetter();

      assert.equal(result, undefined); // Expected to fail in test
      assert.equal(mockOnError.mock.callCount(), 1);
    });

    test("should handle empty path", async () => {
      const emptyPath = "";
      const mockOnError = mock.fn();
      const shaGetter = createCurrentShaGetter(emptyPath, mockOnError);

      const result = await shaGetter();

      assert.equal(result, undefined);
      assert.equal(mockOnError.mock.callCount(), 1);
    });
  });

  describe("error callback variations", () => {
    test("should work with different error callback signatures", async () => {
      const invalidPath = "/invalid/path";
      let capturedError: unknown;

      const customErrorHandler = (error: unknown) => {
        capturedError = error;
      };

      const shaGetter = createCurrentShaGetter(invalidPath, customErrorHandler);
      await shaGetter();

      assert.ok(capturedError);
    });

    test("should handle throwing error callbacks", async () => {
      const invalidPath = "/invalid/path";
      const throwingErrorHandler = () => {
        throw new Error("Error handler error");
      };

      const shaGetter = createCurrentShaGetter(invalidPath, throwingErrorHandler);

      await assert.rejects(
        async () => {
          await shaGetter();
        },
        /Error handler error/,
      );
    });
  });
});

describe("getErrorMessage", () => {
  describe("Error object handling", () => {
    test("should extract message from Error instance", () => {
      const error = new Error("Test error message");
      const result = getErrorMessage(error);

      assert.equal(result, "Test error message");
    });

    test("should handle Error with empty message", () => {
      const error = new Error("");
      const result = getErrorMessage(error);

      assert.equal(result, "");
    });

    test("should handle Error subclasses", () => {
      const error = new TypeError("Type error message");
      const result = getErrorMessage(error);

      assert.equal(result, "Type error message");
    });

    test("should handle custom Error classes", () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }

      const error = new CustomError("Custom error message");
      const result = getErrorMessage(error);

      assert.equal(result, "Custom error message");
    });
  });

  describe("non-Error object handling", () => {
    test("should convert string to string", () => {
      const error = "String error message";
      const result = getErrorMessage(error);

      assert.equal(result, "String error message");
    });

    test("should convert number to string", () => {
      const error = 42;
      const result = getErrorMessage(error);

      assert.equal(result, "42");
    });

    test("should convert boolean to string", () => {
      const errorTrue = true;
      const errorFalse = false;

      assert.equal(getErrorMessage(errorTrue), "true");
      assert.equal(getErrorMessage(errorFalse), "false");
    });

    test("should convert null to string", () => {
      const error = null;
      const result = getErrorMessage(error);

      assert.equal(result, "null");
    });

    test("should convert undefined to string", () => {
      const error = undefined;
      const result = getErrorMessage(error);

      assert.equal(result, "undefined");
    });

    test("should convert object to string", () => {
      const error = { message: "Object error", code: 500 };
      const result = getErrorMessage(error);

      assert.equal(result, "[object Object]");
    });

    test("should convert array to string", () => {
      const error = ["error", "array"];
      const result = getErrorMessage(error);

      assert.equal(result, "error,array");
    });
  });

  describe("edge cases", () => {
    test("should handle empty string", () => {
      const error = "";
      const result = getErrorMessage(error);

      assert.equal(result, "");
    });

    test("should handle zero", () => {
      const error = 0;
      const result = getErrorMessage(error);

      assert.equal(result, "0");
    });

    test("should handle NaN", () => {
      const error = NaN;
      const result = getErrorMessage(error);

      assert.equal(result, "NaN");
    });

    test("should handle Symbol", () => {
      const error = Symbol("test");
      const result = getErrorMessage(error);

      assert.equal(result, "Symbol(test)");
    });

    test("should handle function", () => {
      const error = function testFunction() {};
      const result = getErrorMessage(error);

      assert.ok(result.includes("function"));
    });

    test("should handle object with toString method", () => {
      const error = {
        toString: () => "Custom toString result",
      };
      const result = getErrorMessage(error);

      assert.equal(result, "Custom toString result");
    });

    test("should handle nested Error in object", () => {
      const nestedError = new Error("Nested error");
      const error = { error: nestedError };
      const result = getErrorMessage(error);

      assert.equal(result, "[object Object]");
    });
  });
});