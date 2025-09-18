import { strict as assert } from "node:assert";
import { test, mock } from "node:test";
import { isGitRepository } from "./repository-validator.js";
import { InMemoryRepositoryCache, type RepositoryCache } from "./cache.js";
import type { GitOperations } from "#types/git.js";

test("isGitRepository", async (t) => {
  await t.test("returns false for nonexistent paths", async () => {
    const result = await isGitRepository("/definitely/nonexistent/path/12345");
    assert.equal(result, false);
  });

  await t.test("uses cache when provided", async () => {
    const cache: RepositoryCache = {
      has: mock.fn(() => true),
      get: mock.fn(() => true),
      set: mock.fn(),
      clear: mock.fn(),
    };

    const result = await isGitRepository("/cached/path", cache);

    assert.equal(result, true);
    assert.equal((cache.get as any).mock.calls.length, 1);
    assert.equal((cache.set as any).mock.calls.length, 0); // Should not set when cache hit
  });

  await t.test("sets cache on miss", async () => {
    const cache = new InMemoryRepositoryCache();

    // First call - cache miss
    const result1 = await isGitRepository("/nonexistent/path", cache);
    assert.equal(result1, false);
    assert.equal(cache.get("/nonexistent/path"), false);

    // Second call - cache hit
    const result2 = await isGitRepository("/nonexistent/path", cache);
    assert.equal(result2, false);
  });

  await t.test("works without cache", async () => {
    const result = await isGitRepository("/nonexistent/path");
    assert.equal(result, false);
  });

  await t.test("uses GitOperations when provided", async () => {
    const mockGitOps: GitOperations = {
      getCurrentBranch: mock.fn(async () => ({ name: "main" })),
      pullWithRebase: mock.fn(),
      fetch: mock.fn(),
      getStatus: mock.fn(),
      getCommitSha: mock.fn(),
    };

    const result = await isGitRepository(
      "/mocked/valid/repo",
      undefined,
      mockGitOps,
    );

    assert.equal(result, true);
    assert.equal((mockGitOps.getCurrentBranch as any).mock.calls.length, 1);
    assert.equal(
      (mockGitOps.getCurrentBranch as any).mock.calls[0].arguments[0],
      "/mocked/valid/repo",
    );
  });

  await t.test("returns false when GitOperations throws", async () => {
    const mockGitOps: GitOperations = {
      getCurrentBranch: mock.fn(async () => {
        throw new Error("Not a git repository");
      }),
      pullWithRebase: mock.fn(),
      fetch: mock.fn(),
      getStatus: mock.fn(),
      getCommitSha: mock.fn(),
    };

    const result = await isGitRepository(
      "/mocked/invalid/repo",
      undefined,
      mockGitOps,
    );

    assert.equal(result, false);
    assert.equal((mockGitOps.getCurrentBranch as any).mock.calls.length, 1);
  });
});
