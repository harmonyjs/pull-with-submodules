/**
 * @fileoverview Unit tests for logger module.
 *
 * Tests the logger functionality with different execution contexts,
 * verifying proper @clack/prompts integration, verbose mode behavior,
 * argument handling, and TUI state management including spinner/task
 * coordination and log buffering.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import type { ExecutionContext } from "#types/core";
import {
  createLogger,
  TUIStateManager,
  type Task,
  type LogImplementation,
} from "./logger.js";

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

/**
 * Creates a mock log implementation for testing.
 */
function createMockLog(): {
  mockLog: LogImplementation;
  mockCalls: {
    step: Array<[string]>;
    info: Array<[string]>;
    warn: Array<[string]>;
    error: Array<[string]>;
  };
} {
  const mockCalls = {
    step: [] as Array<[string]>,
    info: [] as Array<[string]>,
    warn: [] as Array<[string]>,
    error: [] as Array<[string]>,
  };

  const mockLog: LogImplementation = {
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

  return { mockLog, mockCalls };
}

let mockLog: LogImplementation;
let mockCalls: {
  step: Array<[string]>;
  info: Array<[string]>;
  warn: Array<[string]>;
  error: Array<[string]>;
};

beforeEach(() => {
  // Clear TUI registry before each test
  TUIStateManager.clearRegistry();

  // Create fresh mock for each test
  const mock = createMockLog();
  mockLog = mock.mockLog;
  mockCalls = mock.mockCalls;
});

describe("logger - createLogger", () => {
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

describe("logger - debug logging", () => {
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

describe("logger - info logging", () => {
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

describe("logger - warn logging", () => {
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

describe("logger - error logging", () => {
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

describe("logger - TUI withSpinner", () => {
  it("buffers logs during spinner operation", async () => {
    const context = createTestContext({ verbose: true });
    const logger = createLogger(context, mockLog);

    await logger.withSpinner("Processing", async () => {
      // These should be buffered
      logger.info("Step 1");
      logger.debug("Debug info");
      logger.warn("Warning message");
      logger.error("Error message");
    });

    // After spinner completes, buffered logs should be flushed
    // All buffered logs should appear after spinner
    assert.ok(mockCalls.info.some((call) => call[0] === "Step 1"));
    assert.ok(mockCalls.warn.some((call) => call[0] === "Warning message"));
    assert.ok(mockCalls.error.some((call) => call[0] === "Error message"));
    assert.ok(mockCalls.step.some((call) => call[0] === "Debug info"));
  });

  it("handles errors in spinner operation", async () => {
    const context = createTestContext();
    const logger = createLogger(context, mockLog);

    await assert.rejects(
      async () => {
        await logger.withSpinner("Failing operation", async () => {
          logger.info("Before error");
          throw new Error("Test error");
        });
      },
      (error: any) => {
        assert.equal(error.message, "Test error");
        return true;
      },
    );

    // Buffered logs should still be flushed on error
    assert.ok(mockCalls.info.some((call) => call[0] === "Before error"));
  });

  it("prevents nested spinners", async () => {
    const context = createTestContext();
    const logger = createLogger(context, mockLog);

    await logger.withSpinner("Outer spinner", async () => {
      // Nested spinner should be converted to buffered log
      await logger.withSpinner("Inner spinner", async () => {
        logger.info("Inside nested");
      });
    });

    // Inner spinner should be logged as regular message
    assert.ok(mockCalls.info.some((call) => call[0] === "Inside nested"));
  });

  it("returns operation result", async () => {
    const context = createTestContext();
    const logger = createLogger(context, mockLog);

    const result = await logger.withSpinner("Computing", async () => {
      return 42;
    });

    assert.equal(result, 42);
  });
});

describe("logger - TUI withTasks", () => {
  it("processes tasks sequentially", async () => {
    const context = createTestContext();
    const logger = createLogger(context, mockLog);
    const executionOrder: string[] = [];

    const tasks: Task[] = [
      {
        title: "Task 1",
        task: async () => {
          executionOrder.push("task1");
          logger.info("Inside task 1");
          return "Task 1 done";
        },
      },
      {
        title: "Task 2",
        task: async () => {
          executionOrder.push("task2");
          logger.info("Inside task 2");
          return "Task 2 done";
        },
      },
    ];

    await logger.withTasks(tasks);

    assert.deepEqual(executionOrder, ["task1", "task2"]);
    // Logs from tasks should be buffered and flushed in order
    assert.ok(mockCalls.info.some((call) => call[0] === "Inside task 1"));
    assert.ok(mockCalls.info.some((call) => call[0] === "Inside task 2"));
  });

  it("handles task failures", async () => {
    const context = createTestContext();
    const logger = createLogger(context, mockLog);

    const tasks: Task[] = [
      {
        title: "Good task",
        task: async () => {
          logger.info("Task 1 running");
          return "OK";
        },
      },
      {
        title: "Failing task",
        task: async () => {
          logger.error("About to fail");
          throw new Error("Task failed");
        },
      },
    ];

    await assert.rejects(
      async () => {
        await logger.withTasks(tasks);
      },
      (error: any) => {
        assert.ok(error.message.includes("Task failed"));
        return true;
      },
    );

    // First task should complete, second should fail
    assert.ok(mockCalls.info.some((call) => call[0] === "Task 1 running"));
    assert.ok(mockCalls.error.some((call) => call[0] === "About to fail"));
  });

  it("buffers logs during task execution", async () => {
    const context = createTestContext({ verbose: true });
    const logger = createLogger(context, mockLog);

    const tasks: Task[] = [
      {
        title: "Processing submodule",
        task: async () => {
          logger.debug("Fetching remote");
          logger.info("Found local sibling");
          logger.warn("Using local version");
          return "Updated";
        },
      },
    ];

    await logger.withTasks(tasks);

    // All logs should be present but after task completion
    assert.ok(mockCalls.step.some((call) => call[0] === "Fetching remote"));
    assert.ok(mockCalls.info.some((call) => call[0] === "Found local sibling"));
    assert.ok(mockCalls.warn.some((call) => call[0] === "Using local version"));
  });
});

describe("logger - TUI buffering behavior", () => {
  it("flushes buffer in correct order", async () => {
    const context = createTestContext();
    const logger = createLogger(context, mockLog);
    const logOrder: string[] = [];

    // Track order of all log calls
    const originalInfo = mockLog.info;
    mockLog.info = (msg: string) => {
      logOrder.push(`info:${msg}`);
      originalInfo(msg);
    };

    await logger.withSpinner("Processing", async () => {
      logger.info("First");
      logger.info("Second");
      logger.info("Third");
    });

    // Verify logs appear in order after spinner
    const firstIndex = logOrder.findIndex((log) => log.includes("First"));
    const secondIndex = logOrder.findIndex((log) => log.includes("Second"));
    const thirdIndex = logOrder.findIndex((log) => log.includes("Third"));

    assert.ok(firstIndex < secondIndex);
    assert.ok(secondIndex < thirdIndex);
  });

  it("handles mixed log levels during buffering", async () => {
    const context = createTestContext({ verbose: true });
    const logger = createLogger(context, mockLog);

    await logger.withSpinner("Mixed levels", async () => {
      logger.debug("Debug 1");
      logger.info("Info 1");
      logger.warn("Warn 1");
      logger.error("Error 1");
      logger.verbose("Verbose 1");
    });

    // All log levels should be preserved
    assert.ok(mockCalls.step.some((call) => call[0] === "Debug 1"));
    assert.ok(mockCalls.info.some((call) => call[0] === "Info 1"));
    assert.ok(mockCalls.warn.some((call) => call[0] === "Warn 1"));
    assert.ok(mockCalls.error.some((call) => call[0] === "Error 1"));
  });

  it("clears buffer after successful flush", async () => {
    const context = createTestContext();
    const logger = createLogger(context, mockLog);

    await logger.withSpinner("First operation", async () => {
      logger.info("First op log");
    });

    const beforeSecond = mockCalls.info.length;

    await logger.withSpinner("Second operation", async () => {
      logger.info("Second op log");
    });

    // Second operation should not re-flush first operation's logs
    const afterSecond = mockCalls.info.length;
    assert.ok(afterSecond > beforeSecond);
    assert.ok(
      !mockCalls.info
        .slice(beforeSecond)
        .some((call) => call[0] === "First op log"),
    );
  });
});

describe("logger - argument formatting", () => {
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
      'test {\n  "foo": "bar"\n} [\n  1,\n  2,\n  3\n] null undefined',
    );
  });
});
