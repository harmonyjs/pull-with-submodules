/**
 * @fileoverview Update plan preparation for submodules.
 *
 * Responsible for coordinating the preparation of comprehensive update plans
 * by orchestrating path resolution, repository validation, and branch resolution.
 */

import { isGitRepository } from "#lib/git/index";
import { fileExists } from "#lib/fs/core";
import type { ExecutionContext, Submodule } from "#types/core";
import type { Logger } from "#ui/logger";
import type { SubmoduleUpdatePlan, BranchResolution } from "./types.js";
import { resolveSubmodulePaths } from "./paths.js";
import type { GitSha } from "#types/git";

/**
 * Coordinates all information gathering needed for a submodule update decision.
 */
export async function prepareUpdatePlan(params: {
  submodule: Submodule;
  context: ExecutionContext;
  logger: Logger;
  resolveBranch: (submodule: Submodule) => Promise<BranchResolution>;
}): Promise<SubmoduleUpdatePlan> {
  const { submodule, context, logger, resolveBranch } = params;
  logger.verbose(`Preparing update plan for submodule ${submodule.name}`);

  const { absolutePath, normalizedSubmodule } = resolveSubmodulePaths(
    submodule,
    context,
  );

  const pathExists = await fileExists(absolutePath);
  const isRepositoryValid = pathExists
    ? await isGitRepository(absolutePath)
    : false;
  const needsInit = !isRepositoryValid;

  const branch = await resolveBranch(normalizedSubmodule);

  return {
    submodule: normalizedSubmodule,
    branch,
    needsInit,
    isRepositoryValid,
  };
}

/**
 * Adds current commit SHA only when the repository exists and is accessible.
 */
export async function enrichPlanWithCurrentSha(
  plan: SubmoduleUpdatePlan,
  getCurrentSha: () => Promise<GitSha | undefined>,
): Promise<SubmoduleUpdatePlan> {
  if (plan.isRepositoryValid) {
    const currentSha = await getCurrentSha();
    if (currentSha) {
      return { ...plan, currentSha };
    }
  }

  return plan;
}
