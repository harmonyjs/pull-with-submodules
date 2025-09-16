/**
 * @fileoverview Unit tests for error type guards and utilities.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { GitOperationError } from "./git-operation.js";
import { NetworkError } from "./network.js";
import { isAppError } from "./guards.js";

void test("isAppError: positive case with GitOperationError", () => {
  const err = new GitOperationError("Test error", { cause: new Error() });
  assert.ok(isAppError(err));
});

void test("isAppError: positive case with NetworkError", () => {
  const err = new NetworkError("Test error", { cause: new Error() });
  assert.ok(isAppError(err));
});

void test("isAppError: negative case with generic Error", () => {
  assert.equal(isAppError(new Error("generic")), false);
});

void test("isAppError: negative case with null/undefined", () => {
  assert.equal(isAppError(null), false);
  assert.equal(isAppError(undefined), false);
});

void test("isAppError: negative case with other types", () => {
  assert.equal(isAppError("string"), false);
  assert.equal(isAppError(42), false);
  assert.equal(isAppError({}), false);
  assert.equal(isAppError([]), false);
});
