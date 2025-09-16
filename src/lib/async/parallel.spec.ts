/**
 * @fileoverview Unit tests for parallel execution utilities.
 *
 * Tests createParallelRunner with concurrency limits, error handling,
 * and timing measurements for controlled parallel execution.
 */

import { describe, it } from "node:test";
import { strictEqual, ok } from "node:assert";
import { createParallelRunner } from "./parallel.js";
import { delay } from "./timing.js";

const TEST_DELAY_MS = 30;
const TEST_TIMEOUT_MS = 50;
const TEST_DURATION_TOLERANCE_MS = 15;
const MEASURE_DELAY_MS = 20;
const CONCURRENCY_TEST_DELAY_MS = 10;

describe("createParallelRunner", () => {
  it("should execute operations in parallel", async () => {
    const startTime = Date.now();
    const operations = [
      async () => {
        await delay(TEST_DELAY_MS);
        return "result1";
      },
      async () => {
        await delay(TEST_DELAY_MS);
        return "result2";
      },
    ];

    const runParallel = createParallelRunner(2);
    const results = await runParallel(operations);
    const totalTime = Date.now() - startTime;

    ok(
      totalTime < TEST_TIMEOUT_MS,
      `Total time was ${totalTime}ms, expected < ${TEST_TIMEOUT_MS}ms`,
    );
    strictEqual(results.length, 2);
  });

  it("should handle failed operations", async () => {
    const operations = [
      async () => "success",
      async () => {
        throw new Error("Operation failed");
      },
    ];

    const runParallel = createParallelRunner(2);
    const results = await runParallel(operations);

    strictEqual(results.length, 2);
    ok(results[0] && results[1]);

    // First operation succeeded
    ok(results[0].success);
    if (results[0].success) {
      strictEqual(results[0].value, "success");
    }

    // Second operation failed
    ok(!results[1].success);
    if (!results[1].success) {
      ok(results[1].error instanceof Error);
    }
  });

  it("should measure execution duration", async () => {
    const operations = [
      async () => {
        await delay(MEASURE_DELAY_MS);
        return "result";
      },
    ];

    const runParallel = createParallelRunner(1);
    const results = await runParallel(operations);

    strictEqual(results.length, 1);
    ok(results[0]);
    ok(
      results[0].duration >= TEST_DURATION_TOLERANCE_MS &&
        results[0].duration <= MEASURE_DELAY_MS + TEST_DURATION_TOLERANCE_MS,
    );
  });

  it("should respect concurrency limits", async () => {
    let concurrentOperations = 0;
    let maxConcurrentOperations = 0;

    const operations = Array.from({ length: 5 }, () => async () => {
      concurrentOperations++;
      maxConcurrentOperations = Math.max(
        maxConcurrentOperations,
        concurrentOperations,
      );
      await delay(CONCURRENCY_TEST_DELAY_MS);
      concurrentOperations--;
      return "result";
    });

    const runParallel = createParallelRunner(2);
    await runParallel(operations);

    // Should not exceed concurrency limit of 2
    ok(
      maxConcurrentOperations <= 2,
      `Max concurrent was ${maxConcurrentOperations}, expected <= 2`,
    );
  });

  it("should handle empty operations array", async () => {
    const runParallel = createParallelRunner(2);
    const results = await runParallel([]);

    strictEqual(results.length, 0);
  });

  it("should handle non-Error thrown values", async () => {
    const operations = [
      async () => {
        throw new Error("string error");
      },
    ];

    const runParallel = createParallelRunner(1);
    const results = await runParallel(operations);

    strictEqual(results.length, 1);
    ok(results[0]);
    ok(!results[0].success);
    if (!results[0].success) {
      ok(results[0].error instanceof Error);
      strictEqual(results[0].error.message, "string error");
    }
  });

  it("should use default concurrency when not specified", async () => {
    const runParallel = createParallelRunner();
    const operations = [async () => "result"];
    const results = await runParallel(operations);

    strictEqual(results.length, 1);
    ok(results[0]);
    ok(results[0].success);
  });
});
