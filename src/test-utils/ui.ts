/**
 * @fileoverview UI-specific test utilities and mocks.
 *
 * Provides logger mocks and UI-related test helpers for testing
 * UI components and interactions.
 */

import type { Logger, Task } from "#ui";
import { createTypedMock, type MockFunction } from "./core.js";

/**
 * Logger mock with properly typed mock functions.
 */
export interface LoggerMock {
  debug: MockFunction<Logger["debug"]>;
  verbose: MockFunction<Logger["verbose"]>;
  info: MockFunction<Logger["info"]>;
  warn: MockFunction<Logger["warn"]>;
  error: MockFunction<Logger["error"]>;
  withSpinner: <T>(message: string, operation: () => Promise<T>) => Promise<T>;
  withTasks: (tasks: Task[]) => Promise<void>;
  createCallbacks: () => {
    onProgress?: (message: string) => void;
    onSuccess?: (message: string) => void;
    onError?: (message: string) => void;
    onWarning?: (message: string) => void;
  };
}

/**
 * Creates a logger mock with spyable methods for capturing specific calls.
 *
 * @param captureMethod Optional method name to make spyable
 * @returns Logger mock with specified method as spy
 * @example
 * const logger = createSpyLogger("info");
 * logger.info("test");
 * assert.equal(getMockCallCount(logger.info), 1);
 */
export function createSpyLogger(
  captureMethod?: keyof Pick<
    Logger,
    "debug" | "verbose" | "info" | "warn" | "error"
  >,
): LoggerMock & { [K in keyof LoggerMock]: LoggerMock[K] } {
  const logger = createMockLogger();

  if (captureMethod !== undefined) {
    // Create a spy that captures calls to the specified method
    const calls: Array<{ arguments: unknown[] }> = [];
    const originalMethod = logger[captureMethod];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for spy implementation
    (logger[captureMethod] as any) = (...args: unknown[]): unknown => {
      calls.push({ arguments: args });
      if (typeof originalMethod === "function") {
        return (originalMethod as (...a: unknown[]) => unknown)(...args);
      }
      return undefined;
    };

    // Add mock interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- Required for mock interface
    (logger[captureMethod] as any).mock = {
      calls,
      callCount: (): number => calls.length,
    };
  }

  return logger;
}

/**
 * Creates a complete mock Logger implementation for testing.
 *
 * All methods are properly mocked using Node.js test runner mock.fn()
 * and implement the full Logger interface including withSpinner and withTasks.
 * Returns a LoggerMock with typed mock methods for type-safe test assertions.
 *
 * This is the recommended mock for most testing scenarios as it provides
 * both simple no-op implementations and advanced mocking capabilities.
 *
 * @returns Complete Logger mock with all required methods
 * @example
 * const logger = createMockLogger();
 * await logger.withSpinner("Processing", async () => {
 *   // Test logic here
 * });
 * const calls = getMockCalls(logger.info);
 */
export function createMockLogger(): LoggerMock {
  return {
    debug: createTypedMock<Logger["debug"]>(),
    verbose: createTypedMock<Logger["verbose"]>(),
    info: createTypedMock<Logger["info"]>(),
    warn: createTypedMock<Logger["warn"]>(),
    error: createTypedMock<Logger["error"]>(),
    withSpinner: async <T>(
      _message: string,
      operation: () => Promise<T>,
    ): Promise<T> => {
      return await operation();
    },
    withTasks: async (tasks: Task[]): Promise<void> => {
      for (const task of tasks) {
        const result = task.task();
        if (result instanceof Promise) {
          await result;
        }
      }
    },
    createCallbacks: (): {
      onProgress?: (message: string) => void;
      onSuccess?: (message: string) => void;
      onError?: (message: string) => void;
      onWarning?: (message: string) => void;
    } => ({
      onProgress: (): void => {},
      onSuccess: (): void => {},
      onError: (): void => {},
      onWarning: (): void => {},
    }),
  };
}

/**
 * Creates a simple Logger implementation for basic testing.
 *
 * This provides a lightweight alternative to createMockLogger() for cases
 * where you don't need the advanced mocking capabilities and just want
 * a functional logger that does nothing.
 *
 * @returns Simple Logger implementation with no-op methods
 * @example
 * const logger = createSimpleLogger();
 * logger.info("This will not output anything");
 */
export function createSimpleLogger(): Logger {
  const noop = (): void => {
    // Mock implementation - no operation
  };

  return {
    debug: noop,
    verbose: noop,
    info: noop,
    warn: noop,
    error: noop,
    withSpinner: async <T>(
      _message: string,
      operation: () => Promise<T>,
    ): Promise<T> => {
      return await operation();
    },
    withTasks: async (tasks: Task[]): Promise<void> => {
      for (const task of tasks) {
        await task.task();
      }
    },
    createCallbacks: (): {
      onProgress?: (message: string) => void;
      onSuccess?: (message: string) => void;
      onError?: (message: string) => void;
      onWarning?: (message: string) => void;
    } => ({
      onProgress: noop,
      onSuccess: noop,
      onError: noop,
      onWarning: noop,
    }),
  };
}
