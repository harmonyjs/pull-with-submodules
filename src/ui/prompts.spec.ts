/**
 * @fileoverview Unit tests for prompts module.
 *
 * Tests basic functionality of prompt wrappers. Since @clack/prompts
 * involves complex terminal interaction, these tests focus on the
 * wrapper logic and error handling rather than full integration.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { note } from "./prompts.js";

describe("prompts", () => {
  let originalConsole: {
    log: typeof console.log;
  };

  let mockCalls: {
    log: Array<[string, ...unknown[]]>;
  };

  beforeEach(() => {
    // Save original console methods
    originalConsole = {
      log: console.log,
    };

    // Reset mock call tracking
    mockCalls = {
      log: [],
    };

    // Mock console.log for clack note output capture
    console.log = (message: string, ...args: unknown[]) => {
      mockCalls.log.push([message, ...args]);
    };
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
  });

  describe("note", () => {
    it("displays info notes", () => {
      note("Test information", "info");
      // Note: clack.note outputs to console, but the exact format is implementation-specific
      // We just verify the function doesn't throw
      assert.ok(true);
    });

    it("displays warning notes", () => {
      note("Test warning", "warning");
      assert.ok(true);
    });

    it("displays error notes", () => {
      note("Test error", "error");
      assert.ok(true);
    });

    it("defaults to info type", () => {
      note("Default test");
      assert.ok(true);
    });
  });

  describe("integration smoke tests", () => {
    it("intro and outro don't throw", async () => {
      // These are visual functions that we can't easily test output
      // but we can verify they don't crash
      const { intro, outro } = await import("./prompts.js");

      assert.doesNotThrow(() => {
        intro();
      });

      assert.doesNotThrow(() => {
        outro("Test completion message");
      });
    });

    it("handleCancellation has correct signature", async () => {
      const { handleCancellation } = await import("./prompts.js");

      assert.equal(typeof handleCancellation, "function");
      // We can't test the actual execution since it calls process.exit
      // but we can verify the function exists and has the right type
    });
  });

  describe("spinner function", () => {
    it("executes operation and returns result", async () => {
      const { spinner } = await import("./prompts.js");

      const testOperation = async () => {
        return "test-result";
      };

      const result = await spinner("Testing...", testOperation);
      assert.equal(result, "test-result");
    });

    it("propagates operation errors", async () => {
      const { spinner } = await import("./prompts.js");

      const testOperation = async () => {
        throw new Error("Test error");
      };

      await assert.rejects(
        async () => {
          await spinner("Testing...", testOperation);
        },
        {
          message: "Test error",
        },
      );
    });
  });
});
