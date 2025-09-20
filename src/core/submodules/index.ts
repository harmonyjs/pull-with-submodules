/**
 * @fileoverview Core submodule processing factory for pull-with-submodules.
 *
 * Provides factory function for creating SubmoduleProcessor instances and
 * essential public types.
 */

import type { ExecutionContext, Submodule } from "#types/core";
import type { SubmoduleProcessor, SubmoduleUpdatePlan } from "./types.js";
import { SubmoduleProcessorImpl } from "./processor.js";

// Re-export essential public types
export type {
  BranchResolution,
  SubmoduleUpdatePlan,
  SubmoduleProcessor,
  BranchSource,
} from "./types.js";

// Re-export constants
export { BRANCH_SOURCES, DEFAULT_BRANCH } from "./types.js";

// Re-export sibling discovery functionality
export { findSiblingRepository } from "./siblings.js";
export type { SiblingRepository, SiblingDiscoveryOptions } from "./siblings.js";

/**
 * Creates a configured SubmoduleProcessor instance.
 *
 * @param context - Execution context
 * @returns SubmoduleProcessor implementation
 */
export function createSubmoduleProcessor(
  context: ExecutionContext,
): SubmoduleProcessor {
  return new SubmoduleProcessorImpl(context);
}

/**
 * Convenience function to parse submodules from repository root.
 *
 * @param repoPath - Absolute path to repository root
 * @param context - Execution context
 * @returns Array of parsed submodule configurations
 */
export async function parseSubmodules(
  repoPath: string,
  context: ExecutionContext,
): Promise<Submodule[]> {
  const processor = new SubmoduleProcessorImpl(context);
  return processor.parseSubmodules(repoPath);
}

/**
 * Convenience function to prepare update plans for all submodules.
 *
 * Creates a single processor instance and reuses it for all submodules
 * within the same operation for efficiency.
 *
 * @param submodules - Array of submodule configurations
 * @param context - Execution context
 * @returns Array of update plans
 */
export async function prepareUpdatePlans(
  submodules: Submodule[],
  context: ExecutionContext,
): Promise<SubmoduleUpdatePlan[]> {
  if (submodules.length === 0) {
    return [];
  }

  const processor = new SubmoduleProcessorImpl(context);
  const plans: SubmoduleUpdatePlan[] = [];

  for (const submodule of submodules) {
    const plan = await processor.prepareUpdatePlan(submodule);
    plans.push(plan);
  }

  return plans;
}
