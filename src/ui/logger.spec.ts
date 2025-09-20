/**
 * @fileoverview Unit tests for logger module.
 *
 * Tests the logger functionality with different execution contexts,
 * verifying proper prefix application, verbose mode behavior, and
 * dry-run mode integration.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import type { ExecutionContext } from "#types/core";
import { createLogger } from "./logger.js";

describe("logger", () => {
  let originalConsole: {
    debug: typeof console.debug;
    info: typeof console.info;
    warn: typeof console.warn;
    error: typeof console.error;
  };

  let mockCalls: {
    debug: Array<[string, ...unknown[]]>;
    info: Array<[string, ...unknown[]]>;
    warn: Array<[string, ...unknown[]]>;
    error: Array<[string, ...unknown[]]>;
  };

  beforeEach(() => {
    // Save original console methods
    originalConsole = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
    };

    // Reset mock call tracking
    mockCalls = {
      debug: [],
      info: [],
      warn: [],
      error: [],
    };

    // Mock console methods
    console.debug = (message: string, ...args: unknown[]) => {
      mockCalls.debug.push([message, ...args]);
    };
    console.info = (message: string, ...args: unknown[]) => {
      mockCalls.info.push([message, ...args]);
    };
    console.warn = (message: string, ...args: unknown[]) => {
      mockCalls.warn.push([message, ...args]);
    };
    console.error = (message: string, ...args: unknown[]) => {
      mockCalls.error.push([message, ...args]);
    };
  });

  afterEach(() => {
    // Restore original console methods
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  const createTestContext = (
    overrides: Partial<ExecutionContext> = {},
  ): ExecutionContext => ({
    dryRun: false,
    noCommit: false,
    forceRemote: false,
    parallel: false,
    verbose: false,
    repositoryRoot: "/test/repo",
    ...overrides,
  });

  describe("createLogger", () => {
    it("creates a logger instance", () => {
      const context = createTestContext();
      const logger = createLogger(context);

      assert.ok(logger !== undefined);
      assert.equal(typeof logger.debug, "function");
      assert.equal(typeof logger.info, "function");
      assert.equal(typeof logger.warn, "function");
      assert.equal(typeof logger.error, "function");
    });
  });

  describe("debug logging", () => {
    it("does not log when verbose is false", () => {
      const context = createTestContext({ verbose: false });
      const logger = createLogger(context);

      logger.debug("test message");

      assert.equal(mockCalls.debug.length, 0);
    });

    it("logs when verbose is true", () => {
      const context = createTestContext({ verbose: true });
      const logger = createLogger(context);

      logger.debug("test message");

      assert.equal(mockCalls.debug.length, 1);
      assert.equal(mockCalls.debug[0]?.[0], "🔍 test message");
    });

    it("adds DRY-RUN prefix in dry-run mode", () => {
      const context = createTestContext({ verbose: true, dryRun: true });
      const logger = createLogger(context);

      logger.debug("test message");

      assert.equal(mockCalls.debug.length, 1);
      assert.equal(mockCalls.debug[0]?.[0], "🔍 DRY-RUN: test message");
    });

    it("passes additional arguments", () => {
      const context = createTestContext({ verbose: true });
      const logger = createLogger(context);

      logger.debug("test %s %d", "string", 42);

      assert.equal(mockCalls.debug.length, 1);
      assert.equal(mockCalls.debug[0]?.[0], "🔍 test %s %d");
      assert.equal(mockCalls.debug[0]?.[1], "string");
      assert.equal(mockCalls.debug[0]?.[2], 42);
    });
  });

  describe("info logging", () => {
    it("always logs info messages", () => {
      const context = createTestContext({ verbose: false });
      const logger = createLogger(context);

      logger.info("test message");

      assert.equal(mockCalls.info.length, 1);
      assert.equal(mockCalls.info[0]?.[0], "ℹ️ test message");
    });

    it("adds DRY-RUN prefix in dry-run mode", () => {
      const context = createTestContext({ dryRun: true });
      const logger = createLogger(context);

      logger.info("test message");

      assert.equal(mockCalls.info.length, 1);
      assert.equal(mockCalls.info[0]?.[0], "ℹ️ DRY-RUN: test message");
    });
  });

  describe("warn logging", () => {
    it("always logs warning messages", () => {
      const context = createTestContext();
      const logger = createLogger(context);

      logger.warn("test warning");

      assert.equal(mockCalls.warn.length, 1);
      assert.equal(mockCalls.warn[0]?.[0], "⚠️ test warning");
    });

    it("adds DRY-RUN prefix in dry-run mode", () => {
      const context = createTestContext({ dryRun: true });
      const logger = createLogger(context);

      logger.warn("test warning");

      assert.equal(mockCalls.warn.length, 1);
      assert.equal(mockCalls.warn[0]?.[0], "⚠️ DRY-RUN: test warning");
    });
  });

  describe("error logging", () => {
    it("always logs error messages", () => {
      const context = createTestContext();
      const logger = createLogger(context);

      logger.error("test error");

      assert.equal(mockCalls.error.length, 1);
      assert.equal(mockCalls.error[0]?.[0], "❌ test error");
    });

    it("adds DRY-RUN prefix in dry-run mode", () => {
      const context = createTestContext({ dryRun: true });
      const logger = createLogger(context);

      logger.error("test error");

      assert.equal(mockCalls.error.length, 1);
      assert.equal(mockCalls.error[0]?.[0], "❌ DRY-RUN: test error");
    });
  });

  describe("prefix combination", () => {
    it("combines verbose and dry-run prefixes correctly", () => {
      const context = createTestContext({ verbose: true, dryRun: true });
      const logger = createLogger(context);

      logger.debug("test message");
      logger.info("test info");
      logger.warn("test warning");
      logger.error("test error");

      assert.equal(mockCalls.debug[0]?.[0], "🔍 DRY-RUN: test message");
      assert.equal(mockCalls.info[0]?.[0], "ℹ️ DRY-RUN: test info");
      assert.equal(mockCalls.warn[0]?.[0], "⚠️ DRY-RUN: test warning");
      assert.equal(mockCalls.error[0]?.[0], "❌ DRY-RUN: test error");
    });
  });
});
