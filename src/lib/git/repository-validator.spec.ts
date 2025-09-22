/**
 * @fileoverview Test suite for git repository validation utilities.
 *
 * Tests repository validation functionality including caching mechanisms
 * to efficiently determine if paths contain valid git repositories.
 */

import { strict as assert } from "node:assert";
import { test, mock } from "node:test";
import { isGitRepository } from "./repository-validator.js";
import { InMemoryRepositoryCache, type RepositoryCache } from "./cache.js";
import { createTypedMock, type MockFunction } from "#test-utils";

/**
 * Creates a typed mock repository cache for testing without using as any.
 * Uses the centralized createTypedMock helper for type safety.
 */
function createMockCache(
  cacheHit: boolean = true,
  cacheValue: boolean = true,
): {
  cache: RepositoryCache;
  getMock: MockFunction<RepositoryCache["get"]>;
  setMock: MockFunction<RepositoryCache["set"]>;
} {
  const getMock = createTypedMock<RepositoryCache["get"]>(() => cacheValue);
  const setMock = createTypedMock<RepositoryCache["set"]>();

  const cache: RepositoryCache = {
    has: mock.fn(() => cacheHit),
    get: getMock,
    set: setMock,
    clear: mock.fn(),
  };

  return { cache, getMock, setMock };
}

test("isGitRepository", async (t) => {
  await t.test("returns false for nonexistent paths", async () => {
    const result = await isGitRepository("/definitely/nonexistent/path/12345");
    assert.equal(result, false);
  });

  await t.test("uses cache when provided", async () => {
    const { cache, getMock, setMock } = createMockCache(true, true);

    const result = await isGitRepository("/cached/path", cache);

    assert.equal(result, true);
    assert.equal(getMock.mock.calls.length, 1);
    assert.equal(setMock.mock.calls.length, 0); // Should not set when cache hit
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
});
