/**
 * @fileoverview Type definitions for submodule processing operations.
 *
 * Defines interfaces and types used by the submodule processing system
 * for branch resolution, update planning, and processor operations.
 */

import type { Submodule } from "#types/core.js";
import type { GitSha } from "#types/git.js";

/**
 * Constants for branch resolution sources.
 */
export const BRANCH_SOURCES = {
  EXPLICIT: "explicit",
  DETECTED: "detected",
  FALLBACK: "fallback",
} as const;

/**
 * Default branch name for fallback scenarios.
 */
export const DEFAULT_BRANCH = "main";

/**
 * Source classification for branch resolution.
 */
export type BranchSource = (typeof BRANCH_SOURCES)[keyof typeof BRANCH_SOURCES];

/**
 * Result of branch resolution for a submodule.
 */
export interface BranchResolution {
  readonly branch: string;
  readonly source: BranchSource;
  readonly details: string;
}

/**
 * Prepared update plan for a submodule.
 */
export interface SubmoduleUpdatePlan {
  readonly submodule: Submodule;
  readonly branch: BranchResolution;
  readonly currentSha?: GitSha;
  readonly needsInit: boolean;
  readonly isRepositoryValid: boolean;
}

/**
 * Interface for submodule processing operations.
 */
export interface SubmoduleProcessor {
  parseSubmodules(repoPath: string): Promise<Submodule[]>;
  resolveBranch(submodule: Submodule): Promise<BranchResolution>;
  syncSubmodule(submodulePath: string): Promise<void>;
  initializeSubmodule(submodulePath: string): Promise<void>;
  prepareUpdatePlan(submodule: Submodule): Promise<SubmoduleUpdatePlan>;
}
