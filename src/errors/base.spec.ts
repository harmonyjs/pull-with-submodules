/**
 * @fileoverview Unit tests for BaseAppError abstract base class.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { BaseAppError, type AppErrorOptions } from "./base.js";
import type { ErrorCode } from "./types.js";

// Concrete subclass for testing
class TestAppError extends BaseAppError {
  constructor(message: string, opts: Omit<AppErrorOptions, "code">) {
    super(message, { ...opts, code: "GIT_OPERATION" as ErrorCode });
  }
}

void test("BaseAppError: basic properties and immutability", () => {
  const err = new TestAppError("Test message", {
    cause: new Error("underlying"),
    suggestions: ["Try again", "Check configuration"],
    details: { context: "test", retry: true },
  });

  assert.equal(err.name, "TestAppError");
  assert.equal(err.message, "Test message");
  assert.equal(err.code, "GIT_OPERATION");
  assert.ok(err.cause instanceof Error);
  assert.deepEqual(err.suggestions, ["Try again", "Check configuration"]);
  assert.deepEqual(err.details, { context: "test", retry: true });
  assert.ok(Object.isFrozen(err));
  assert.ok(err instanceof BaseAppError);
  assert.ok(err instanceof Error);
});

void test("BaseAppError: toJSON with all properties", () => {
  const err = new TestAppError("Test message", {
    cause: new Error("underlying"),
    suggestions: ["Try again", "Check configuration"],
    details: { context: "test", retry: true },
  });

  const json = err.toJSON();
  assert.deepEqual(json, {
    name: "TestAppError",
    message: "Test message",
    code: "GIT_OPERATION",
    suggestions: ["Try again", "Check configuration"],
    details: { context: "test", retry: true },
  });
});

void test("BaseAppError: toJSON with minimal properties", () => {
  const err = new TestAppError("Minimal error", { cause: new Error() });

  const json = err.toJSON();
  assert.deepEqual(json, {
    name: "TestAppError",
    message: "Minimal error",
    code: "GIT_OPERATION",
  });

  // Ensure undefined properties are not present in JSON
  assert.equal("suggestions" in json, false);
  assert.equal("details" in json, false);
});

void test("BaseAppError: toJSON with only suggestions", () => {
  const err = new TestAppError("Error with suggestions", {
    cause: new Error(),
    suggestions: ["Check logs", "Restart service"],
  });

  const json = err.toJSON();
  assert.deepEqual(json, {
    name: "TestAppError",
    message: "Error with suggestions",
    code: "GIT_OPERATION",
    suggestions: ["Check logs", "Restart service"],
  });

  assert.equal("details" in json, false);
});

void test("BaseAppError: toJSON with only details", () => {
  const err = new TestAppError("Error with details", {
    cause: new Error(),
    details: { operation: "sync", timeout: 5000 },
  });

  const json = err.toJSON();
  assert.deepEqual(json, {
    name: "TestAppError",
    message: "Error with details",
    code: "GIT_OPERATION",
    details: { operation: "sync", timeout: 5000 },
  });

  assert.equal("suggestions" in json, false);
});