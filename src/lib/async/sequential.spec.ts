/**
 * @fileoverview Unit tests for sequential execution utilities.
 *
 * Tests sequential with execution order, timing delays, error handling,
 * and edge cases for controlled sequential async operations.
 */

import { describe, it } from "node:test";
import { strictEqual, ok, rejects } from "node:assert";
import { sequential } from "./sequential.js";
import { delay } from "./timing.js";

const TEST_DELAY_BETWEEN_MS = 50;
const TEST_DELAY_TOLERANCE_MS = 5;
const TEST_MAX_COMPLETION_MS = 75;

describe("sequential", () => {
  it("should execute operations in order", async () => {
    const executionOrder: number[] = [];
    const operations = [
      async () => {
        executionOrder.push(1);
        return "result1";
      },
      async () => {
        executionOrder.push(2);
        return "result2";
      },
      async () => {
        executionOrder.push(3);
        return "result3";
      },
    ];

    const results = await sequential(operations);

    strictEqual(results.length, 3);
    strictEqual(results[0], "result1");
    strictEqual(results[1], "result2");
    strictEqual(results[2], "result3");
    strictEqual(executionOrder.length, 3);
    strictEqual(executionOrder[0], 1);
    strictEqual(executionOrder[1], 2);
    strictEqual(executionOrder[2], 3);
  });

  it("should respect delay between operations", async () => {
    const timestamps: number[] = [];
    const operations = [
      async () => {
        timestamps.push(Date.now());
        return "result1";
      },
      async () => {
        timestamps.push(Date.now());
        return "result2";
      },
    ];

    const startTime = Date.now();
    await sequential(operations, TEST_DELAY_BETWEEN_MS);
    const totalTime = Date.now() - startTime;

    strictEqual(timestamps.length, 2);
    const timeBetween = (timestamps[1] ?? 0) - (timestamps[0] ?? 0);
    ok(
      timeBetween >= TEST_DELAY_BETWEEN_MS - TEST_DELAY_TOLERANCE_MS,
      `Time between operations was ${timeBetween}ms, expected >= ${TEST_DELAY_BETWEEN_MS - TEST_DELAY_TOLERANCE_MS}ms`,
    );
    ok(
      totalTime >= TEST_DELAY_BETWEEN_MS - TEST_DELAY_TOLERANCE_MS,
      `Total time was ${totalTime}ms, expected >= ${TEST_DELAY_BETWEEN_MS - TEST_DELAY_TOLERANCE_MS}ms`,
    );
  });

  it("should not delay after the last operation", async () => {
    const operations = [async () => "result1", async () => "result2"];

    const startTime = Date.now();
    await sequential(operations, TEST_DELAY_BETWEEN_MS);
    const totalTime = Date.now() - startTime;

    ok(
      totalTime < TEST_MAX_COMPLETION_MS,
      `Total time was ${totalTime}ms, expected < ${TEST_MAX_COMPLETION_MS}ms`,
    );
  });

  it("should handle failed operations", async () => {
    const operations = [
      async () => "success",
      async () => {
        throw new Error("Operation failed");
      },
      async () => "should not execute",
    ];

    await rejects(() => sequential(operations), /Operation failed/);
  });

  it("should execute without delay when delayBetween is 0", async () => {
    const operations = [
      async () => {
        await delay(10);
        return "result1";
      },
      async () => {
        await delay(10);
        return "result2";
      },
    ];

    const startTime = Date.now();
    const results = await sequential(operations, 0);
    const totalTime = Date.now() - startTime;

    strictEqual(results.length, 2);
    // Should complete in ~20ms (no extra delays)
    ok(totalTime < 35, `Total time was ${totalTime}ms, expected < 35ms`);
  });

  it("should execute without delay when delayBetween is not specified", async () => {
    const operations = [
      async () => {
        await delay(10);
        return "result1";
      },
      async () => {
        await delay(10);
        return "result2";
      },
    ];

    const startTime = Date.now();
    const results = await sequential(operations);
    const totalTime = Date.now() - startTime;

    strictEqual(results.length, 2);
    // Should complete in ~20ms (no extra delays)
    ok(totalTime < 35, `Total time was ${totalTime}ms, expected < 35ms`);
  });

  it("should handle empty operations array", async () => {
    const results = await sequential([]);
    strictEqual(results.length, 0);
  });

  it("should handle single operation", async () => {
    const operations = [async () => "single result"];

    const results = await sequential(operations, 50);
    strictEqual(results.length, 1);
    strictEqual(results[0], "single result");
  });

  it("should throw for undefined operation", async () => {
    const operations: Array<() => Promise<string>> = [
      async () => "result1",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      undefined as any,
      async () => "result3",
    ];

    await rejects(
      () => sequential(operations),
      /Operation at index 1 is undefined/,
    );
  });

  it("should preserve operation result types", async () => {
    const operations = [async () => 42, async () => 100];

    const results = await sequential(operations);
    strictEqual(results.length, 2);
    strictEqual(typeof results[0], "number");
    strictEqual(typeof results[1], "number");
    strictEqual(results[0], 42);
    strictEqual(results[1], 100);
  });

  it("should handle mixed async and sync operations", async () => {
    const operations = [
      async () => {
        await delay(5);
        return "async";
      },
      async () => "sync",
    ];

    const results = await sequential(operations);
    strictEqual(results.length, 2);
    strictEqual(results[0], "async");
    strictEqual(results[1], "sync");
  });
});
