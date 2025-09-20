/**
 * @fileoverview Helper functions for SubmoduleProcessor.
 *
 * Contains utility functions extracted from the processor class
 * to reduce file size and improve modularity.
 */

import type { Submodule, ExecutionContext } from "#types/core";
import type { SubmoduleUpdatePlan } from "./types.js";
import type { Logger } from "#ui/logger";
import { resolveSubmodulePaths } from "./paths.js";

/**
 * Validates and logs warnings about submodule paths.
 */
export function validateAndLogPaths(
  submodule: Submodule,
  logger: Logger,
): void {
  if (submodule.path.startsWith("/")) {
    logger.warn(
      `Submodule '${submodule.name}' has absolute path; this will be normalized to relative`,
    );
  }
}

/**
 * Logs detailed information about the update plan.
 */
export function logPlanDetails(
  plan: SubmoduleUpdatePlan,
  logger: Logger,
): void {
  logger.debug(`Update plan prepared for ${plan.submodule.name}:`, {
    branch: plan.branch.branch,
    source: plan.branch.source,
    needsInit: plan.needsInit,
    hasCurrentSha: Boolean(plan.currentSha),
  });

  if (plan.currentSha) {
    logger.debug(`Current SHA for ${plan.submodule.name}: ${plan.currentSha}`);
  }
}

/**
 * Creates a path cache manager for submodules.
 */
export function createPathCache(): {
  get: (
    submodule: Submodule,
    context: ExecutionContext,
  ) => {
    absolutePath: string;
    normalizedSubmodule: Submodule;
  };
} {
  const cache = new WeakMap<
    Submodule,
    { absolutePath: string; normalizedSubmodule: Submodule }
  >();

  return {
    get(
      submodule: Submodule,
      context: ExecutionContext,
    ): {
      absolutePath: string;
      normalizedSubmodule: Submodule;
    } {
      let cached = cache.get(submodule);
      if (!cached) {
        cached = resolveSubmodulePaths(submodule, context);
        cache.set(submodule, cached);
      }
      return cached;
    },
  };
}
