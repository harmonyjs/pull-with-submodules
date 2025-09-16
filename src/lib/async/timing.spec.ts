/**
 * @fileoverview Unit tests for timing utilities.
 *
 * Tests delay function with various timing scenarios, edge cases,
 * and accuracy measurements for controlled async timing.
 */

import { describe, it } from "node:test";
import { strictEqual, ok } from "node:assert";
import { delay } from "./timing.js";

describe("delay", () => {
  it("should delay execution for specified milliseconds", async () => {
    const startTime = Date.now();
    await delay(50);
    const elapsed = Date.now() - startTime;

    // Allow some tolerance for timing variance
    ok(elapsed >= 45, `Elapsed time was ${elapsed}ms, expected >= 45ms`);
    ok(elapsed <= 75, `Elapsed time was ${elapsed}ms, expected <= 75ms`);
  });

  it("should handle zero delay", async () => {
    const startTime = Date.now();
    await delay(0);
    const elapsed = Date.now() - startTime;

    // Should complete almost immediately
    ok(elapsed < 10, `Elapsed time was ${elapsed}ms, expected < 10ms`);
  });

  it("should handle very small delays", async () => {
    const startTime = Date.now();
    await delay(1);
    const elapsed = Date.now() - startTime;

    // Should complete quickly but may take slightly longer than 1ms
    ok(elapsed < 15, `Elapsed time was ${elapsed}ms, expected < 15ms`);
  });

  it("should return a Promise that resolves to void", async () => {
    const result = await delay(10);
    strictEqual(result, undefined);
  });

  it("should work with Promise.race", async () => {
    const startTime = Date.now();

    const result = await Promise.race([
      delay(100).then(() => "timeout"),
      delay(20).then(() => "fast"),
    ]);

    const elapsed = Date.now() - startTime;
    strictEqual(result, "fast");
    ok(elapsed < 50, `Elapsed time was ${elapsed}ms, expected < 50ms`);
  });

  it("should work with Promise.all", async () => {
    const startTime = Date.now();

    await Promise.all([delay(30), delay(20), delay(25)]);

    const elapsed = Date.now() - startTime;
    // Should complete in ~30ms (the longest delay) when run in parallel
    ok(elapsed >= 25, `Elapsed time was ${elapsed}ms, expected >= 25ms`);
    ok(elapsed < 50, `Elapsed time was ${elapsed}ms, expected < 50ms`);
  });

  it("should be interruptible with Promise.race", async () => {
    const startTime = Date.now();
    let interrupted = false;

    const delayPromise = delay(1000);
    const interruptPromise = delay(50).then(() => {
      interrupted = true;
      return "interrupted";
    });

    const result = await Promise.race([delayPromise, interruptPromise]);
    const elapsed = Date.now() - startTime;

    strictEqual(result, "interrupted");
    strictEqual(interrupted, true);
    ok(elapsed < 100, `Elapsed time was ${elapsed}ms, expected < 100ms`);
  });

  it("should handle negative delays as zero", async () => {
    const startTime = Date.now();
    await delay(-100);
    const elapsed = Date.now() - startTime;

    // Negative delays should behave like zero delay
    ok(elapsed < 10, `Elapsed time was ${elapsed}ms, expected < 10ms`);
  });

  it("should handle large delays", async () => {
    const startTime = Date.now();
    const delayPromise = delay(5000);

    // We'll race it with a much shorter delay to avoid long test times
    const result = await Promise.race([
      delayPromise.then(() => "long"),
      delay(10).then(() => "short"),
    ]);

    const elapsed = Date.now() - startTime;
    strictEqual(result, "short");
    ok(elapsed < 50, `Test completed too slowly: ${elapsed}ms`);
  });

  it("should work in sequential calls", async () => {
    const timestamps: number[] = [];

    timestamps.push(Date.now());
    await delay(20);
    timestamps.push(Date.now());
    await delay(20);
    timestamps.push(Date.now());

    const firstDelay = (timestamps[1] ?? 0) - (timestamps[0] ?? 0);
    const secondDelay = (timestamps[2] ?? 0) - (timestamps[1] ?? 0);

    ok(firstDelay >= 15, `First delay was ${firstDelay}ms, expected >= 15ms`);
    ok(
      secondDelay >= 15,
      `Second delay was ${secondDelay}ms, expected >= 15ms`,
    );
  });
});
