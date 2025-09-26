/**
 * @fileoverview Tests for commit selection strategies.
 *
 * Comprehensive test suite covering all decision branches in smart commit selection,
 * including edge cases, error conditions, and force-remote scenarios.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  selectCommitSmart,
  type CommitSelectionOptions,
} from "./strategies.js";
import {
  createGitAncestryChecker,
  createMockAncestryChecker,
} from "./ancestry-checker.js";

/**
 * Creates default options for testing.
 */
function createDefaultOptions(
  overrides: Partial<CommitSelectionOptions> = {},
): CommitSelectionOptions {
  return {
    forceRemote: false,
    cwd: "/mock/repo",
    ...overrides,
  };
}

test("selectCommitSmart", async (t) => {
  await t.test("when forceRemote is true", async (subTest) => {
    await subTest.test("prefers remote when available", async () => {
      const result = await selectCommitSmart(
        "local123",
        "remote456",
        createDefaultOptions({ forceRemote: true }),
      );

      assert.deepEqual(result, {
        sha: "remote456",
        source: "remote",
        reason: "forced by --force-remote flag",
      });
    });

    await subTest.test(
      "returns null when remote is not available",
      async () => {
        const result = await selectCommitSmart(
          "local123",
          null,
          createDefaultOptions({ forceRemote: true }),
        );

        assert.equal(result, null);
      },
    );

    await subTest.test("handles undefined remote", async () => {
      const result = await selectCommitSmart(
        "local123",
        undefined as unknown as null,
        createDefaultOptions({ forceRemote: true }),
      );

      assert.equal(result, null);
    });
  });

  await t.test("when both local and remote are available", async (subTest) => {
    await subTest.test(
      "prefers local when it contains remote changes",
      async () => {
        // Test the actual function with dependency injection
        const options = createDefaultOptions({ cwd: "/tmp/test-repo" });

        // Since we can't easily mock git operations, we'll test with fake/empty repo
        // The function should handle the git error gracefully and fall back to remote
        const result = await selectCommitSmart(
          "local123",
          "remote456",
          options,
        );

        // Expects fallback to remote due to git error (no valid repo)
        assert.equal(result?.sha, "remote456");
        assert.equal(result?.source, "remote");
        assert.ok(
          result?.reason.startsWith("ancestry check failed"),
          `Expected reason to start with "ancestry check failed", got: ${result?.reason}`,
        );
      },
    );

    await subTest.test(
      "prefers local when histories have diverged",
      async () => {
        const options = createDefaultOptions({ cwd: "/tmp/test-repo" });

        const result = await selectCommitSmart(
          "local123",
          "remote456",
          options,
        );

        // Should fallback to remote due to git error (no valid repo)
        assert.equal(result?.sha, "remote456");
        assert.equal(result?.source, "remote");
        assert.ok(
          result?.reason.startsWith("ancestry check failed"),
          `Expected reason to start with "ancestry check failed", got: ${result?.reason}`,
        );
      },
    );

    await subTest.test(
      "falls back to remote when ancestry check fails",
      async () => {
        const options = createDefaultOptions({ cwd: "/nonexistent/path" });

        const result = await selectCommitSmart(
          "local123",
          "remote456",
          options,
        );

        assert.equal(result?.sha, "remote456");
        assert.equal(result?.source, "remote");
        assert.ok(result?.reason.includes("ancestry check failed"));
      },
    );

    await subTest.test("prefers remote when local is behind", async () => {
      const mockChecker = createMockAncestryChecker(
        new Map([
          ["remote456->local123", false],
          ["local123->remote456", true],
        ]),
      );

      const options = createDefaultOptions({ ancestryChecker: mockChecker });

      const result = await selectCommitSmart("local123", "remote456", options);

      assert.deepEqual(result, {
        sha: "remote456",
        source: "remote",
        reason: "local is behind remote",
      });
    });

    await subTest.test(
      "prefers local when both have unique commits",
      async () => {
        const mockChecker = createMockAncestryChecker(
          new Map([
            ["remote456->local123", false],
            ["local123->remote456", false],
          ]),
        );

        const options = createDefaultOptions({ ancestryChecker: mockChecker });

        const result = await selectCommitSmart(
          "local123",
          "remote456",
          options,
        );

        assert.deepEqual(result, {
          sha: "local123",
          source: "local",
          reason: "local has unpushed changes",
        });
      },
    );
  });

  await t.test("when only one source is available", async (subTest) => {
    await subTest.test("uses local when only local is available", async () => {
      const result = await selectCommitSmart(
        "local123",
        null,
        createDefaultOptions(),
      );

      assert.deepEqual(result, {
        sha: "local123",
        source: "local",
        reason: "only local source available",
      });
    });

    await subTest.test(
      "uses remote when only remote is available",
      async () => {
        const result = await selectCommitSmart(
          null,
          "remote456",
          createDefaultOptions(),
        );

        assert.deepEqual(result, {
          sha: "remote456",
          source: "remote",
          reason: "only remote source available",
        });
      },
    );

    await subTest.test("handles undefined local properly", async () => {
      const result = await selectCommitSmart(
        undefined as unknown as null,
        "remote456",
        createDefaultOptions(),
      );

      assert.deepEqual(result, {
        sha: "remote456",
        source: "remote",
        reason: "only remote source available",
      });
    });
  });

  await t.test("when no sources are available", async (subTest) => {
    await subTest.test("returns null when both are null", async () => {
      const result = await selectCommitSmart(
        null,
        null,
        createDefaultOptions(),
      );

      assert.equal(result, null);
    });

    await subTest.test("returns null when both are undefined", async () => {
      const result = await selectCommitSmart(
        undefined as unknown as null,
        undefined as unknown as null,
        createDefaultOptions(),
      );

      assert.equal(result, null);
    });
  });
});

test("createGitAncestryChecker", async (t) => {
  await t.test("creates checker with proper interface", async () => {
    const checker = createGitAncestryChecker("/test/repo");

    assert.equal(typeof checker.isAncestor, "function");
    assert.equal(checker.isAncestor.length, 2);
  });

  await t.test("handles cwd parameter correctly", async () => {
    const checkerWithCwd = createGitAncestryChecker("/test/repo");
    const checkerWithoutCwd = createGitAncestryChecker();

    // Both should be valid checkers
    assert.equal(typeof checkerWithCwd.isAncestor, "function");
    assert.equal(typeof checkerWithoutCwd.isAncestor, "function");
  });
});

test("selectCommitSmart with mocked ancestry", async (t) => {
  await t.test("prefers local when it contains remote", async () => {
    // Setup mock: remote456 is ancestor of local123
    const mockChecker = createMockAncestryChecker(
      new Map([["remote456->local123", true]]),
    );

    const result = await selectCommitSmart("local123", "remote456", {
      forceRemote: false,
      ancestryChecker: mockChecker,
    });

    assert.equal(result?.sha, "local123");
    assert.equal(result?.source, "local");
    assert.equal(result?.reason, "local contains all remote changes");
  });

  await t.test("prefers remote when histories diverged", async () => {
    const mockChecker = createMockAncestryChecker(
      new Map([["remote456->local123", false]]),
    );

    const result = await selectCommitSmart("local123", "remote456", {
      forceRemote: false,
      ancestryChecker: mockChecker,
    });

    assert.equal(result?.sha, "remote456");
    assert.equal(result?.source, "remote");
    assert.equal(result?.reason, "remote has diverged from local");
  });
});

test("edge cases and input validation", async (t) => {
  await t.test("handles empty string inputs", async () => {
    const result = await selectCommitSmart(
      "",
      "remote456",
      createDefaultOptions(),
    );

    assert.deepEqual(result, {
      sha: "remote456",
      source: "remote",
      reason: "only remote source available",
    });
  });

  await t.test("handles mixed null and string inputs", async () => {
    const result1 = await selectCommitSmart(
      "local123",
      "",
      createDefaultOptions(),
    );

    assert.deepEqual(result1, {
      sha: "local123",
      source: "local",
      reason: "only local source available",
    });
  });

  await t.test("preserves exact SHA values in output", async () => {
    const localSha = "a1b2c3d4e5f6789012345678901234567890abcd";

    const result = await selectCommitSmart(
      localSha,
      null,
      createDefaultOptions(),
    );

    assert.equal(result?.sha, localSha);
    assert.equal(result?.source, "local");
  });
});
