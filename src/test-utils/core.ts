/**
 * @fileoverview Core test utilities and mock helpers.
 *
 * Provides generic mock function interfaces and utilities for
 * creating type-safe mocks across all layers.
 */

import { mock } from "node:test";

/**
 * Type-safe mock function interface for Node.js test runner.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for generic mock function typing
export interface MockFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  mock: {
    calls: Array<{ arguments: Parameters<T> }>;
    callCount(): number;
  };
}

/**
 * Type-safe helper to get mock calls from a mock function.
 *
 * @param mockFn Mock function created with Node.js test runner
 * @returns Array of call arguments
 * @example
 * const logger = createMockLogger();
 * logger.info("test message");
 * const calls = getMockCalls(logger.info);
 * assert.equal(calls[0]?.arguments[0], "test message");
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for generic mock function typing
export function getMockCalls<T extends (...args: any[]) => any>(
  mockFn: MockFunction<T>,
): Array<{ arguments: Parameters<T> }> {
  return mockFn.mock.calls;
}

/**
 * Type-safe helper to get call count from a mock function.
 *
 * @param mockFn Mock function created with Node.js test runner
 * @returns Number of times the function was called
 * @example
 * const logger = createMockLogger();
 * logger.info("test");
 * assert.equal(getMockCallCount(logger.info), 1);
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for generic mock function typing
export function getMockCallCount<T extends (...args: any[]) => any>(
  mockFn: MockFunction<T>,
): number {
  return mockFn.mock.callCount();
}

/**
 * Creates a typed mock function that preserves the exact signature.
 * Uses unknown type assertion for compatibility with Node.js test runner API.
 *
 * @param implementation Optional implementation function
 * @returns Properly typed mock function
 * @example
 * const mockResolver = createTypedMock<(submodule: Submodule) => Promise<BranchResolution>>(
 *   async () => ({ branch: "main", source: "explicit", details: "test" })
 * );
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for generic mock function typing
export function createTypedMock<T extends (...args: any[]) => any>(
  implementation?: T,
): MockFunction<T> {
  return mock.fn(implementation) as unknown as MockFunction<T>;
}

/**
 * Creates a spy function that can capture calls while executing the original.
 *
 * @param originalFn Original function to spy on
 * @returns Spy function that records calls
 * @example
 * const spy = createSpy(originalLogger.info);
 * spy("test message");
 * assert.equal(getMockCallCount(spy), 1);
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for generic spy function typing
export function createSpy<T extends (...args: any[]) => any>(
  originalFn: T,
): MockFunction<T> {
  return mock.fn(originalFn) as unknown as MockFunction<T>;
}
