/**
 * @fileoverview Unit tests for retry utilities.
 */

import { describe, it, mock } from "node:test";
import { strictEqual } from "node:assert";
import { retry } from "./retry.js";

describe("retry", () => {
  it("should succeed on first attempt", async () => {
    const operation = mock.fn(async () => "success");
    const result = await retry(operation);
    strictEqual(result, "success");
    strictEqual(operation.mock.calls.length, 1);
  });

  it("should retry on failure and eventually succeed", async () => {
    let attempts = 0;
    const operation = mock.fn(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error(`Attempt ${attempts} failed`);
      }
      return "success";
    });

    const result = await retry(operation, {
      maxAttempts: 3,
      initialDelay: 10,
    });
    strictEqual(result, "success");
    strictEqual(operation.mock.calls.length, 3);
  });

  it("should use default config when no config provided", async () => {
    const operation = mock.fn(async () => {
      throw new Error("Always fails");
    });

    try {
      await retry(operation);
    } catch {
      // Expected to throw
    }

    strictEqual(operation.mock.calls.length, 3);
  });
});
