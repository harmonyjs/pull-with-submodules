/**
 * @fileoverview Unit tests for logger module.
 *
 * Basic tests for the new UIManager-based logger architecture.
 * Tests logger creation, callback creation, and basic interface compliance.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import type { ExecutionContext } from "#types/core";
import { createLogger } from "./logger.js";
import { UIManager } from "./ui-manager.js";

/**
 * Creates a test execution context with optional overrides.
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

beforeEach(() => {
  // Clear UIManager before each test
  UIManager.resetInstance();
});

describe("logger - createLogger", () => {
  it("creates a logger instance", () => {
    const context = createTestContext();
    const logger = createLogger(context);

    assert.ok(logger !== undefined);
    assert.equal(typeof logger.debug, "function");
    assert.equal(typeof logger.info, "function");
    assert.equal(typeof logger.warn, "function");
    assert.equal(typeof logger.error, "function");
    assert.equal(typeof logger.verbose, "function");
    assert.equal(typeof logger.withSpinner, "function");
    assert.equal(typeof logger.withTasks, "function");
    assert.equal(typeof logger.createCallbacks, "function");
  });

  it("creates operation callbacks", () => {
    const context = createTestContext();
    const logger = createLogger(context);
    const callbacks = logger.createCallbacks();

    assert.ok(callbacks !== undefined);
    assert.equal(typeof callbacks.onProgress, "function");
    assert.equal(typeof callbacks.onSuccess, "function");
    assert.equal(typeof callbacks.onError, "function");
    assert.equal(typeof callbacks.onWarning, "function");
  });

  it("handles verbose mode configuration", () => {
    const verboseContext = createTestContext({ verbose: true });
    const logger = createLogger(verboseContext);

    // Should create logger without errors
    assert.ok(logger !== undefined);
  });
});