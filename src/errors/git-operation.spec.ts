/**
 * @fileoverview Unit tests for GitOperationError class.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { GitOperationError } from "./git-operation.js";

void test("GitOperationError: basic properties and immutability", () => {
  const err = new GitOperationError("Rebase failed", {
    cause: new Error("conflict"),
    suggestions: ["Resolve conflicts", "Run git rebase --continue"],
    details: { step: "pull --rebase" },
  });
  assert.equal(err.name, "GitOperationError");
  assert.equal(err.message, "Rebase failed");
  assert.equal(err.code, "GIT_OPERATION");
  assert.ok(err.cause instanceof Error);
  assert.deepEqual(err.suggestions, [
    "Resolve conflicts",
    "Run git rebase --continue",
  ]);
  assert.deepEqual(err.details, { step: "pull --rebase" });
  assert.ok(Object.isFrozen(err));
  assert.ok(err instanceof GitOperationError);
});

void test("GitOperationError: toJSON serialization", () => {
  const err = new GitOperationError("Rebase failed", {
    cause: new Error("conflict"),
    suggestions: ["Resolve conflicts", "Run git rebase --continue"],
    details: { step: "pull --rebase" },
  });
  const json = err.toJSON();
  assert.deepEqual(json, {
    name: "GitOperationError",
    message: "Rebase failed",
    code: "GIT_OPERATION",
    suggestions: ["Resolve conflicts", "Run git rebase --continue"],
    details: { step: "pull --rebase" },
  });
});

void test("GitOperationError: static type guard", () => {
  const err = new GitOperationError("Test error", { cause: new Error() });
  assert.ok(GitOperationError.is(err));
  assert.equal(GitOperationError.is(new Error("generic")), false);
  assert.equal(GitOperationError.is(null), false);
  assert.equal(GitOperationError.is(undefined), false);
});

void test("GitOperationError: minimal properties", () => {
  const err = new GitOperationError("Simple error", { cause: new Error() });
  assert.equal(err.name, "GitOperationError");
  assert.equal(err.message, "Simple error");
  assert.equal(err.code, "GIT_OPERATION");
  assert.equal(err.suggestions, undefined);
  assert.equal(err.details, undefined);
  assert.ok(Object.isFrozen(err));

  const json = err.toJSON();
  assert.deepEqual(json, {
    name: "GitOperationError",
    message: "Simple error",
    code: "GIT_OPERATION",
  });
});