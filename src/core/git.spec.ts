/**
 * @fileoverview Tests for git operations module.
 */

import { strict as assert } from "node:assert";
import { test, mock } from "node:test";
import type { SimpleGit, StatusResult } from "simple-git";
import type { ExecutionContext } from "../types/core.js";
import { asGitSha } from "../lib/git/sha-utils.js";

// Dynamic import to test the actual implementation
let createGit: typeof import("./git.js").createGit;
let GitOperationError: typeof import("../errors/index.js").GitOperationError;

test("setup", async () => {
  const gitModule = await import("./git.js");
  const errorsModule = await import("../errors/index.js");
  createGit = gitModule.createGit;
  GitOperationError = errorsModule.GitOperationError;
});

/**
 * Creates a minimal execution context for testing.
 */
function createTestContext(
  overrides: Partial<ExecutionContext> = {},
): ExecutionContext {
  return {
    dryRun: false,
    noCommit: false,
    forceRemote: false,
    parallel: false,
    verbose: false,
    repositoryRoot: "/test/repo",
    ...overrides,
  };
}

/**
 * Creates a minimal StatusResult for testing.
 */
function createTestStatusResult(
  overrides: Partial<StatusResult> = {},
): StatusResult {
  return {
    files: [],
    current: "main",
    tracking: "origin/main",
    ahead: 0,
    behind: 0,
    not_added: [],
    conflicted: [],
    created: [],
    deleted: [],
    modified: [],
    renamed: [],
    staged: [],
    ...overrides,
  } as unknown as StatusResult;
}

test("createGit returns GitOperations interface", () => {
  const context = createTestContext();
  const git = createGit(context);

  assert.ok(typeof git.pullWithRebase === "function");
  assert.ok(typeof git.fetch === "function");
  assert.ok(typeof git.getStatus === "function");
  assert.ok(typeof git.getCurrentBranch === "function");
  assert.ok(typeof git.getCommitSha === "function");
});

test("pullWithRebase - success case", async () => {
  const mockResult = {
    summary: { changes: 3, insertions: 10, deletions: 2 },
    files: ["file1.ts", "file2.ts"],
  };

  const mockPull = mock.fn(() => Promise.resolve(mockResult));
  const mockGit = { pull: mockPull } as unknown as SimpleGit;

  const context = createTestContext();
  const mockGitFactory = mock.fn(() => mockGit);
  const gitOps = createGit(context, mockGitFactory);

  const result = await gitOps.pullWithRebase("/test/repo");

  assert.deepEqual(result, {
    summary: { changes: 3, insertions: 10, deletions: 2 },
    files: ["file1.ts", "file2.ts"],
    remote: null,
  });
  assert.equal(mockPull.mock.calls.length, 1);
});

test("pullWithRebase - dry run mode", async () => {
  const context = createTestContext({ dryRun: true });
  const gitOps = createGit(context);

  const result = await gitOps.pullWithRebase("/test/repo");

  assert.ok(result.summary);
  assert.equal(result.summary.changes, 0);
});

test("pullWithRebase - rebase conflict error", async () => {
  const conflictError = new Error("CONFLICT: Merge conflict in file.ts");
  const mockPull = mock.fn(() => Promise.reject(conflictError));
  const mockGit = { pull: mockPull } as unknown as SimpleGit;

  const context = createTestContext();
  const mockGitFactory = mock.fn(() => mockGit);
  const gitOps = createGit(context, mockGitFactory);

  await assert.rejects(
    async () => {
      await gitOps.pullWithRebase("/test/repo");
    },
    (error: unknown) => {
      assert.ok(error instanceof GitOperationError);
      assert.ok((error as any).message.includes("Rebase conflicts detected"));
      assert.ok(
        (error as any).suggestions &&
          (error as any).suggestions.some((s: string) =>
            s.includes("git rebase --continue"),
          ),
      );
      return true;
    },
  );
});

test("pullWithRebase - generic error", async () => {
  const networkError = new Error("Network timeout");
  const mockPull = mock.fn(() => Promise.reject(networkError));
  const mockGit = { pull: mockPull } as unknown as SimpleGit;

  const context = createTestContext();
  const mockGitFactory = mock.fn(() => mockGit);
  const gitOps = createGit(context, mockGitFactory);

  await assert.rejects(
    async () => {
      await gitOps.pullWithRebase("/test/repo");
    },
    (error: unknown) => {
      assert.ok(error instanceof GitOperationError);
      assert.ok((error as any).message.includes("Pull with rebase failed"));
      assert.ok(
        (error as any).suggestions &&
          (error as any).suggestions.some((s: string) =>
            s.includes("network connectivity"),
          ),
      );
      return true;
    },
  );
});

test("fetch - success case", async () => {
  const mockFetch = mock.fn(() => Promise.resolve());
  const mockGit = { fetch: mockFetch } as unknown as SimpleGit;

  const context = createTestContext();
  const mockGitFactory = mock.fn(() => mockGit);
  const gitOps = createGit(context, mockGitFactory);

  await gitOps.fetch("/test/repo");

  assert.equal(mockFetch.mock.calls.length, 1);
});

test("fetch - dry run mode", async () => {
  const context = createTestContext({ dryRun: true });
  const gitOps = createGit(context);

  await gitOps.fetch("/test/repo");
});

test("fetch - error handling", async () => {
  const networkError = new Error("Connection refused");
  const mockFetch = mock.fn(() => Promise.reject(networkError));
  const mockGit = { fetch: mockFetch } as unknown as SimpleGit;

  const context = createTestContext();
  const mockGitFactory = mock.fn(() => mockGit);
  const gitOps = createGit(context, mockGitFactory);

  await assert.rejects(
    async () => {
      await gitOps.fetch("/test/repo");
    },
    (error: unknown) => {
      assert.ok(error instanceof GitOperationError);
      assert.ok((error as any).message.includes("Fetch failed"));
      return true;
    },
  );
});

test("getStatus - clean working tree", async () => {
  const statusResult = createTestStatusResult();

  const mockStatus = mock.fn(() => Promise.resolve(statusResult));
  const mockGit = { status: mockStatus } as unknown as SimpleGit;

  const context = createTestContext();
  const mockGitFactory = mock.fn(() => mockGit);
  const gitOps = createGit(context, mockGitFactory);

  const result = await gitOps.getStatus("/test/repo");

  assert.equal(result.clean, true);
});

test("getStatus - dirty working tree", async () => {
  const statusResult = createTestStatusResult({
    files: [{ path: "modified.ts", index: "M", working_dir: " " }],
  });

  const mockStatus = mock.fn(() => Promise.resolve(statusResult));
  const mockGit = { status: mockStatus } as unknown as SimpleGit;

  const context = createTestContext();
  const mockGitFactory = mock.fn(() => mockGit);
  const gitOps = createGit(context, mockGitFactory);

  const result = await gitOps.getStatus("/test/repo");

  assert.equal(result.clean, false);
});

test("getCurrentBranch - success case", async () => {
  const statusResult = createTestStatusResult({
    current: "feature-branch",
    tracking: "origin/feature-branch",
  });

  const mockStatus = mock.fn(() => Promise.resolve(statusResult));
  const mockGit = { status: mockStatus } as unknown as SimpleGit;

  const context = createTestContext();
  const mockGitFactory = mock.fn(() => mockGit);
  const gitOps = createGit(context, mockGitFactory);

  const result = await gitOps.getCurrentBranch("/test/repo");

  assert.equal(result.name, "feature-branch");
});

test("getCurrentBranch - detached HEAD", async () => {
  const statusResult = createTestStatusResult({
    current: null,
    tracking: null,
  });

  const mockStatus = mock.fn(() => Promise.resolve(statusResult));
  const mockGit = { status: mockStatus } as unknown as SimpleGit;

  const context = createTestContext();
  const mockGitFactory = mock.fn(() => mockGit);
  const gitOps = createGit(context, mockGitFactory);

  await assert.rejects(
    async () => {
      await gitOps.getCurrentBranch("/test/repo");
    },
    (error: unknown) => {
      assert.ok(error instanceof GitOperationError);
      assert.ok(
        (error as any).message.includes("Cannot determine current branch"),
      );
      assert.ok(
        (error as any).suggestions &&
          (error as any).suggestions.some((s: string) =>
            s.includes("detached HEAD"),
          ),
      );
      return true;
    },
  );
});

test("getCommitSha - success case", async () => {
  const expectedSha = "abc123def456";
  const mockRevparse = mock.fn(() => Promise.resolve(expectedSha));
  const mockGit = { revparse: mockRevparse } as unknown as SimpleGit;

  const context = createTestContext();
  const mockGitFactory = mock.fn(() => mockGit);
  const gitOps = createGit(context, mockGitFactory);

  const result = await gitOps.getCommitSha("/test/repo", "HEAD");

  assert.equal(result, asGitSha(expectedSha));
  assert.equal(mockRevparse.mock.calls.length, 1);
});

test("getCommitSha - invalid reference", async () => {
  const revparseError = new Error("fatal: bad revision 'invalid-ref'");
  const mockRevparse = mock.fn(() => Promise.reject(revparseError));
  const mockGit = { revparse: mockRevparse } as unknown as SimpleGit;

  const context = createTestContext();
  const mockGitFactory = mock.fn(() => mockGit);
  const gitOps = createGit(context, mockGitFactory);

  await assert.rejects(
    async () => {
      await gitOps.getCommitSha("/test/repo", "invalid-ref");
    },
    (error: unknown) => {
      assert.ok(error instanceof GitOperationError);
      assert.ok(
        (error as any).message.includes(
          "Failed to resolve reference: invalid-ref",
        ),
      );
      return true;
    },
  );
});

test("input validation - empty repository path", async () => {
  const context = createTestContext();
  const gitOps = createGit(context);

  await assert.rejects(
    async () => {
      await gitOps.pullWithRebase("");
    },
    (error: unknown) => {
      assert.ok(error instanceof GitOperationError);
      assert.ok(
        (error as any).message.includes("Repository path cannot be empty"),
      );
      return true;
    },
  );

  await assert.rejects(
    async () => {
      await gitOps.fetch("   ");
    },
    (error: unknown) => {
      assert.ok(error instanceof GitOperationError);
      assert.ok(
        (error as any).message.includes("Repository path cannot be empty"),
      );
      return true;
    },
  );
});

test("input validation - empty git reference", async () => {
  const context = createTestContext();
  const gitOps = createGit(context);

  await assert.rejects(
    async () => {
      await gitOps.getCommitSha("/test/repo", "");
    },
    (error: unknown) => {
      assert.ok(error instanceof GitOperationError);
      assert.ok(
        (error as any).message.includes("Git reference cannot be empty"),
      );
      return true;
    },
  );
});

test("verbose mode outputs debug information", async () => {
  const mockFetch = mock.fn(() => Promise.resolve());
  const mockGit = { fetch: mockFetch } as unknown as SimpleGit;

  const context = createTestContext({ verbose: true });
  const mockGitFactory = mock.fn(() => mockGit);
  const gitOps = createGit(context, mockGitFactory);

  const originalDebug = console.debug;
  const debugCalls: string[] = [];
  console.debug = mock.fn((message: string) => {
    debugCalls.push(message);
  });

  try {
    await gitOps.fetch("/test/repo");

    assert.ok(debugCalls.some((call) => call.includes("Fetching remotes")));
    assert.ok(debugCalls.some((call) => call.includes("Fetch completed")));
  } finally {
    console.debug = originalDebug;
  }
});
