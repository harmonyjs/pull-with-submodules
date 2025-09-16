/**
 * @fileoverview Barrel file for public type exports of the project.
 *
 * This directory centralizes all domain & infrastructure type definitions.
 * Concrete type declaration files (e.g. `core.d.ts`, `git.d.ts`) will be
 * added incrementally in checklist section 3 to avoid premature abstractions.
 *
 * Design Rules (enforced by repository guidelines):
 * - Keep files focused; each declaration file owns a clear domain slice.
 * - No re-export of implementation modules here, only types/interfaces.
 * - Avoid placeholder or speculative types – add only when needed.
 * - All public types must be exported through this barrel for discoverability.
 *
 * Usage Example (future):
 *   import type { ExecutionContext } from '../types';
 *
 * Currently intentionally empty – populated as types are implemented.
 */

// Public domain type exports
export type * from "./core.js";
export type * from "./git.js";
