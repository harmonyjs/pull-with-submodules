import { strict as assert } from "node:assert";
import { test } from "node:test";
import { InMemoryRepositoryCache, type RepositoryCache } from "./cache.js";

test("InMemoryRepositoryCache", async (t) => {
  await t.test("basic cache operations", () => {
    const cache = new InMemoryRepositoryCache();

    // Initially empty
    assert.equal(cache.has("/test/path"), false);
    assert.equal(cache.get("/test/path"), undefined);

    // Set and get
    cache.set("/test/path", true);
    assert.equal(cache.has("/test/path"), true);
    assert.equal(cache.get("/test/path"), true);

    // Set false value
    cache.set("/other/path", false);
    assert.equal(cache.get("/other/path"), false);

    // Clear all
    cache.clear();
    assert.equal(cache.has("/test/path"), false);
    assert.equal(cache.has("/other/path"), false);
  });

  await t.test("handles different paths independently", () => {
    const cache = new InMemoryRepositoryCache();

    cache.set("/path/one", true);
    cache.set("/path/two", false);

    assert.equal(cache.get("/path/one"), true);
    assert.equal(cache.get("/path/two"), false);
    assert.equal(cache.get("/path/three"), undefined);
  });

  await t.test("implements RepositoryCache interface", () => {
    const cache: RepositoryCache = new InMemoryRepositoryCache();

    // Should have all required methods
    assert.equal(typeof cache.has, "function");
    assert.equal(typeof cache.get, "function");
    assert.equal(typeof cache.set, "function");
    assert.equal(typeof cache.clear, "function");
  });
});
