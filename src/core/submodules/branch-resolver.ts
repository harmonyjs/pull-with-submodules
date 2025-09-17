/**
 * @fileoverview Branch resolution logic for submodules.
 *
 * Handles branch resolution using priority ordering.
 */

import { join } from "node:path";
import { isGitRepository, getBranchName } from "../../lib/git/core.js";
import type { ExecutionContext, Submodule } from "../../types/core.js";
import type { Logger } from "../../ui/logger.js";
import {
  BRANCH_SOURCES,
  DEFAULT_BRANCH,
  type BranchResolution,
} from "./types.js";
import { getErrorMessage } from "./helpers.js";

/**
 * Resolves target branch using priority ordering designed to preserve user intent:
 * 1. Explicit branch from .gitmodules (highest priority - explicit configuration)
 * 2. Current branch detection from existing repository (preserves working state)
 * 3. Fallback to 'main' (modern default, replaces legacy 'master')
 */
export async function resolveBranch(
  submodule: Submodule,
  context: ExecutionContext,
  logger: Logger,
): Promise<BranchResolution> {
  logger.debug(`Resolving branch for submodule ${submodule.name}`);

  if (submodule.branch !== undefined && submodule.branch.trim().length > 0) {
    return {
      branch: submodule.branch,
      source: BRANCH_SOURCES.EXPLICIT,
      details: `Explicit branch configured in .gitmodules`,
    };
  }

  const submodulePath = join(context.repositoryRoot, submodule.path);

  try {
    const isRepo = await isGitRepository(submodulePath);
    if (isRepo) {
      const currentBranch = await getBranchName({ cwd: submodulePath });
      logger.debug(
        `Detected current branch '${currentBranch}' in submodule ${submodule.name}`,
      );

      return {
        branch: currentBranch,
        source: BRANCH_SOURCES.DETECTED,
        details: `Detected from current submodule repository state`,
      };
    }
  } catch (error) {
    logger.warn(
      `Failed to detect branch for ${submodule.name}: ${getErrorMessage(error)}`,
    );
  }

  logger.debug(
    `Using fallback branch '${DEFAULT_BRANCH}' for submodule ${submodule.name}`,
  );
  return {
    branch: DEFAULT_BRANCH,
    source: BRANCH_SOURCES.FALLBACK,
    details: `No explicit branch configured, using '${DEFAULT_BRANCH}' as default`,
  };
}
