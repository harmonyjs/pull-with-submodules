/**
 * @fileoverview Unit tests for NetworkError class.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { NetworkError } from "./network.js";

void test("NetworkError: optional fields omitted", () => {
  const err = new NetworkError("Fetch timeout", {
    cause: new Error("ETIMEDOUT"),
  });
  assert.equal(err.name, "NetworkError");
  assert.equal(err.message, "Fetch timeout");
  assert.equal(err.code, "NETWORK");
  assert.ok(err.cause instanceof Error);
  assert.equal(err.suggestions, undefined);
  assert.equal(err.details, undefined);
  assert.ok(Object.isFrozen(err));

  const json = err.toJSON();
  // suggestions/details omitted when undefined
  assert.deepEqual(json, {
    name: "NetworkError",
    message: "Fetch timeout",
    code: "NETWORK",
  });
});

void test("NetworkError: with all properties", () => {
  const err = new NetworkError("Connection failed", {
    cause: new Error("ECONNREFUSED"),
    suggestions: ["Check internet connection", "Verify repository URL"],
    details: { url: "https://github.com/user/repo.git", timeout: 30000 },
  });
  assert.equal(err.name, "NetworkError");
  assert.equal(err.message, "Connection failed");
  assert.equal(err.code, "NETWORK");
  assert.deepEqual(err.suggestions, [
    "Check internet connection",
    "Verify repository URL",
  ]);
  assert.deepEqual(err.details, {
    url: "https://github.com/user/repo.git",
    timeout: 30000,
  });
  assert.ok(Object.isFrozen(err));

  const json = err.toJSON();
  assert.deepEqual(json, {
    name: "NetworkError",
    message: "Connection failed",
    code: "NETWORK",
    suggestions: ["Check internet connection", "Verify repository URL"],
    details: { url: "https://github.com/user/repo.git", timeout: 30000 },
  });
});

void test("NetworkError: static type guard", () => {
  const err = new NetworkError("Test error", { cause: new Error() });
  assert.ok(NetworkError.is(err));
  assert.equal(NetworkError.is(new Error("generic")), false);
  assert.equal(NetworkError.is(null), false);
  assert.equal(NetworkError.is(undefined), false);
});
