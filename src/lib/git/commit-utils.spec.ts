import { strict as assert } from "node:assert";
import { test, mock } from "node:test";
import { getCommitSha } from "./commit-utils.js";
import type { GitOperations } from "#types/git.js";
import { asGitSha } from "./sha-utils.js";
import { GitOperationError } from "#errors/index.js";

function createMockGitOps(
  getCommitShaMock?: (repoPath: string, ref: string) => Promise<any>,
): GitOperations {
  return {
    pullWithRebase: mock.fn(),
    fetch: mock.fn(),
    getStatus: mock.fn(),
    getCurrentBranch: mock.fn(),
    getCommitSha: getCommitShaMock || mock.fn(),
  } as any;
}

test("getCommitSha", async (t) => {
  await t.test("success case", async () => {
    const expectedSha = asGitSha("abc123def456");
    const mockGetCommitSha = mock.fn(() => Promise.resolve(expectedSha));
    const gitOps = createMockGitOps(mockGetCommitSha);

    const result = await getCommitSha("/test/repo", "main", gitOps);

    assert.equal(result, expectedSha);
    assert.equal(mockGetCommitSha.mock.calls.length, 1);
    assert.deepEqual(mockGetCommitSha.mock.calls[0]?.arguments, [
      "/test/repo",
      "main",
    ]);
  });

  await t.test("returns null for GitOperationError", async () => {
    const mockGetCommitSha = mock.fn(() =>
      Promise.reject(new GitOperationError("Branch not found", {})),
    );
    const gitOps = createMockGitOps(mockGetCommitSha);

    const result = await getCommitSha("/test/repo", "nonexistent", gitOps);

    assert.equal(result, null);
    assert.equal(mockGetCommitSha.mock.calls.length, 1);
  });

  await t.test("throws non-GitOperationError", async () => {
    const networkError = new Error("Network timeout");
    const mockGetCommitSha = mock.fn(() => Promise.reject(networkError));
    const gitOps = createMockGitOps(mockGetCommitSha);

    await assert.rejects(async () => {
      await getCommitSha("/test/repo", "main", gitOps);
    }, networkError);
  });
});
