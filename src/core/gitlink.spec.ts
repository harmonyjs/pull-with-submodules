import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  formatGitlinkMessage,
  stageSubmodule,
  checkGitlinkChanges,
  commitGitlink,
  type GitlinkCommitParams,
} from "./gitlink.js";
import type { Submodule } from "#types/core";

test("formatGitlinkMessage", async (t) => {
  await t.test("formats message with short SHA", () => {
    const message = formatGitlinkMessage(
      "libs/shared",
      "main",
      "abc123def456789012345678"
    );
    assert.equal(message, "chore(submodule): bump libs/shared to main @ abc123de");
  });

  await t.test("handles short SHA input", () => {
    const message = formatGitlinkMessage("path/to/module", "develop", "abc123");
    assert.equal(message, "chore(submodule): bump path/to/module to develop @ abc123");
  });

  await t.test("handles different branch names", () => {
    const message = formatGitlinkMessage(
      "components/ui",
      "feature/new-ui",
      "def456789"
    );
    assert.equal(message, "chore(submodule): bump components/ui to feature/new-ui @ def45678");
  });

  await t.test("handles nested paths", () => {
    const message = formatGitlinkMessage(
      "packages/core/utils",
      "v2.0",
      "1234567890abcdef"
    );
    assert.equal(message, "chore(submodule): bump packages/core/utils to v2.0 @ 12345678");
  });
});

test("checkGitlinkChanges", async (t) => {
  await t.test("returns true when git commands fail (safe fallback)", async () => {
    // This will fail because we're not in a git repo or path doesn't exist
    const hasChanges = await checkGitlinkChanges("path/to/submodule");
    assert.equal(hasChanges, true);
  });

  await t.test("accepts configuration without error", async () => {
    // This will fail because we're not in a git repo, but should return true safely
    const hasChanges = await checkGitlinkChanges("path/to/submodule", {
      dryRun: true,
      verbose: true,
    });
    assert.equal(hasChanges, true);
  });

  await t.test("handles different submodule paths", async () => {
    const paths = ["libs/auth", "packages/ui", "modules/core"];
    for (const path of paths) {
      // All should return true as safe fallback when git commands fail
      const hasChanges = await checkGitlinkChanges(path);
      assert.equal(hasChanges, true);
    }
  });
});

test("stageSubmodule", async (t) => {
  await t.test("resolves without error for dry-run mode", async () => {
    // In dry-run mode, no actual git operations are performed
    await assert.doesNotReject(async () => {
      await stageSubmodule("libs/shared", { dryRun: true });
    });
  });

  await t.test("accepts verbose configuration", async () => {
    await assert.doesNotReject(async () => {
      await stageSubmodule("path/to/module", {
        dryRun: true,
        verbose: true,
      });
    });
  });

  await t.test("handles different submodule paths", async () => {
    const paths = ["auth", "ui/components", "backend/services"];
    for (const path of paths) {
      await assert.doesNotReject(async () => {
        await stageSubmodule(path, { dryRun: true });
      });
    }
  });
});

test("commitGitlink", async (t) => {
  const testSubmodule: Submodule = {
    name: "test-module",
    path: "libs/test",
    branch: "main",
  };

  const testParams: GitlinkCommitParams = {
    submodule: testSubmodule,
    targetSha: "abc123def456",
    branch: "main",
  };

  await t.test("creates gitlink result in dry-run mode", async () => {
    const result = await commitGitlink(testParams, { dryRun: true });

    assert.equal(result.executed, false);
    assert.equal(result.message, "chore(submodule): bump libs/test to main @ abc123de");
    assert.equal(result.commitSha, "0000000000000000000000000000000000000000");
  });

  await t.test("respects no-commit flag", async () => {
    const result = await commitGitlink(testParams, {
      dryRun: true,
      noCommit: true,
    });

    assert.equal(result.executed, false);
    assert.equal(result.message, "chore(submodule): bump libs/test to main @ abc123de");
    assert.equal(result.commitSha, undefined);
  });

  await t.test("handles different submodule configurations", async () => {
    const submodules = [
      { name: "auth", path: "services/auth", branch: "main" },
      { name: "ui", path: "packages/ui", branch: "develop" },
      { name: "core", path: "core", branch: "v2.0" },
    ];

    for (const submodule of submodules) {
      const params: GitlinkCommitParams = {
        submodule,
        targetSha: "def456789abc",
        branch: submodule.branch ?? "main",
      };

      const result = await commitGitlink(params, { dryRun: true });

      assert.equal(result.executed, false);
      assert.equal(
        result.message,
        `chore(submodule): bump ${submodule.path} to ${submodule.branch} @ def45678`
      );
    }
  });

  await t.test("formats message correctly for different SHAs", async () => {
    const testCases = [
      { sha: "1234567890abcdef", expected: "12345678" },
      { sha: "abcdef", expected: "abcdef" },
      { sha: "a1b2c3d4e5f6g7h8i9j0", expected: "a1b2c3d4" },
    ];

    for (const testCase of testCases) {
      const params: GitlinkCommitParams = {
        ...testParams,
        targetSha: testCase.sha,
      };

      const result = await commitGitlink(params, { dryRun: true });

      assert(result.message.includes(`@ ${testCase.expected}`));
    }
  });

  await t.test("handles verbose logging configuration", async () => {
    await assert.doesNotReject(async () => {
      await commitGitlink(testParams, {
        dryRun: true,
        verbose: true,
      });
    });
  });

  await t.test("processes minimal submodule without optional branch", async () => {
    const minimalSubmodule: Submodule = {
      name: "minimal",
      path: "minimal",
    };

    const params: GitlinkCommitParams = {
      submodule: minimalSubmodule,
      targetSha: "xyz789",
      branch: "master",
    };

    const result = await commitGitlink(params, { dryRun: true });

    assert.equal(result.executed, false);
    assert.equal(result.message, "chore(submodule): bump minimal to master @ xyz789");
  });
});

test("GitlinkCommitParams interface validation", async (t) => {
  await t.test("accepts valid parameter structure", async () => {
    const validParams: GitlinkCommitParams = {
      submodule: {
        name: "test",
        path: "test/path",
      },
      targetSha: "abc123",
      branch: "main",
    };

    await assert.doesNotReject(async () => {
      await commitGitlink(validParams, { dryRun: true });
    });
  });

  await t.test("works with submodule containing optional branch", async () => {
    const paramsWithBranch: GitlinkCommitParams = {
      submodule: {
        name: "test",
        path: "test/path",
        branch: "develop",
      },
      targetSha: "def456",
      branch: "main", // This overrides submodule.branch
    };

    const result = await commitGitlink(paramsWithBranch, { dryRun: true });

    // Should use the branch from params, not from submodule
    assert(result.message.includes("to main @"));
  });
});