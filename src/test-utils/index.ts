/**
 * @fileoverview Barrel file for centralized test utilities.
 *
 * Provides mock implementations and test helpers for consistent testing
 * across core, UI, and other layers. Re-exports functionality from
 * module-specific test utility files.
 */

// Core test utilities - mock functions and generic helpers
export {
  getMockCalls,
  getMockCallCount,
  createTypedMock,
  createSpy,
  type MockFunction,
} from "./core.js";

// UI test utilities - logger mocks and UI-specific helpers
export {
  createMockLogger,
  createSimpleLogger,
  createSpyLogger,
  type LoggerMock,
} from "./ui.js";
