/**
 * @fileoverview Unit tests for logger module.
 *
 * Tests the logger functionality with different execution contexts,
 * verifying proper @clack/prompts integration, verbose mode behavior, and
 * argument handling.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import type { ExecutionContext } from "#types/core";
import { createLogger, type LogImplementation } from "./logger.js";

describe("logger", () => {
  let mockLog: LogImplementation;
  let mockCalls: {
    step: Array<[string]>;
    info: Array<[string]>;
    warn: Array<[string]>;
    error: Array<[string]>;
  };

  beforeEach(() => {
    // Reset mock call tracking
    mockCalls = {
      step: [],
      info: [],
      warn: [],
      error: [],
    };

    // Create mock log implementation
    mockLog = {
      step: (message: string) => {
        mockCalls.step.push([message]);
      },
      info: (message: string) => {
        mockCalls.info.push([message]);
      },
      warn: (message: string) => {
        mockCalls.warn.push([message]);
      },
      error: (message: string) => {
        mockCalls.error.push([message]);
      },
    };
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
      const logger = createLogger(context, mockLog);

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
      const logger = createLogger(context, mockLog);

      logger.debug("test message");

      assert.equal(mockCalls.step.length, 0);
    });

    it("logs when verbose is true", () => {
      const context = createTestContext({ verbose: true });
      const logger = createLogger(context, mockLog);

      logger.debug("test message");

      assert.equal(mockCalls.step.length, 1);
      assert.equal(mockCalls.step[0]?.[0], "test message");
    });

    it("passes additional arguments", () => {
      const context = createTestContext({ verbose: true });
      const logger = createLogger(context, mockLog);

      logger.debug("test %s %d", "string", 42);

      assert.equal(mockCalls.step.length, 1);
      assert.equal(mockCalls.step[0]?.[0], "test %s %d string 42");
    });
  });

  describe("info logging", () => {
    it("always logs info messages", () => {
      const context = createTestContext({ verbose: false });
      const logger = createLogger(context, mockLog);

      logger.info("test message");

      assert.equal(mockCalls.info.length, 1);
      assert.equal(mockCalls.info[0]?.[0], "test message");
    });

    it("passes additional arguments", () => {
      const context = createTestContext();
      const logger = createLogger(context, mockLog);

      logger.info("test %s %d", "string", 42);

      assert.equal(mockCalls.info.length, 1);
      assert.equal(mockCalls.info[0]?.[0], "test %s %d string 42");
    });
  });

  describe("warn logging", () => {
    it("always logs warning messages", () => {
      const context = createTestContext();
      const logger = createLogger(context, mockLog);

      logger.warn("test warning");

      assert.equal(mockCalls.warn.length, 1);
      assert.equal(mockCalls.warn[0]?.[0], "test warning");
    });

    it("passes additional arguments", () => {
      const context = createTestContext();
      const logger = createLogger(context, mockLog);

      logger.warn("test %s %d", "string", 42);

      assert.equal(mockCalls.warn.length, 1);
      assert.equal(mockCalls.warn[0]?.[0], "test %s %d string 42");
    });
  });

  describe("error logging", () => {
    it("always logs error messages", () => {
      const context = createTestContext();
      const logger = createLogger(context, mockLog);

      logger.error("test error");

      assert.equal(mockCalls.error.length, 1);
      assert.equal(mockCalls.error[0]?.[0], "test error");
    });

    it("passes additional arguments", () => {
      const context = createTestContext();
      const logger = createLogger(context, mockLog);

      logger.error("test %s %d", "string", 42);

      assert.equal(mockCalls.error.length, 1);
      assert.equal(mockCalls.error[0]?.[0], "test %s %d string 42");
    });
  });

  describe("argument formatting", () => {
    it("handles empty args array", () => {
      const context = createTestContext({ verbose: true });
      const logger = createLogger(context, mockLog);

      logger.debug("simple message");

      assert.equal(mockCalls.step.length, 1);
      assert.equal(mockCalls.step[0]?.[0], "simple message");
    });

    it("joins multiple arguments with spaces", () => {
      const context = createTestContext({ verbose: true });
      const logger = createLogger(context, mockLog);

      logger.debug("test", "multiple", "args", 123, true);

      assert.equal(mockCalls.step.length, 1);
      assert.equal(mockCalls.step[0]?.[0], "test multiple args 123 true");
    });

    it("converts non-string arguments to strings", () => {
      const context = createTestContext();
      const logger = createLogger(context, mockLog);

      logger.info("test", { foo: "bar" }, [1, 2, 3], null, undefined);

      assert.equal(mockCalls.info.length, 1);
      assert.equal(
        mockCalls.info[0]?.[0],
        "test {\n  \"foo\": \"bar\"\n} [\n  1,\n  2,\n  3\n] null undefined",
      );
    });
  });
});
