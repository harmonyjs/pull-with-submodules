/**
 * @fileoverview Barrel file for UI destination modules.
 *
 * Re-exports all public APIs from destination modules including interfaces,
 * base classes, and concrete implementations for TUI, JSON, and Silent outputs.
 */

// Base interfaces and classes
export type {
  SpinnerHandle,
  TaskHandle,
  LogDestination,
} from "./base.js";
export { BaseLogDestination } from "./base.js";

// Concrete destination implementations
export { JSONDestination } from "./json.js";
export { SilentDestination } from "./silent.js";
export { TUIDestination } from "./tui.js";