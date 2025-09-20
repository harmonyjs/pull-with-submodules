/**
 * @fileoverview Git submodule operations implementation.
 *
 * Contains the actual git submodule sync and initialization operations
 * separated from the main processor for better modularity.
 */

import { createGit } from "#lib/git/core";
import { isGitRepository } from "#lib/git/index";
import { fileExists } from "#lib/fs/core";
import { GitOperationError } from "#errors/index";
import type { ExecutionContext } from "#types/core";
import type { Logger } from "#ui/logger";
import { toGitRelativePath } from "./paths.js";

/**
 * Synchronizes submodule configuration to match the URL in .gitmodules.
 */
export async function performSubmoduleSync(
  submodulePath: string,
  context: ExecutionContext,
  logger: Logger,
): Promise<void> {
  logger.debug(`Syncing submodule at ${submodulePath}`);

  if (context.dryRun) {
    logger.info(`Would sync submodule at ${submodulePath}`);
    return;
  }

  const isRepo = await isGitRepository(submodulePath);
  if (!isRepo) {
    throw new GitOperationError(
      `Submodule path is not a valid git repository: ${submodulePath}`,
      {
        details: { submodulePath },
        suggestions: [
          "Initialize the submodule first using git submodule init",
          "Check if the path exists and contains a .git directory",
          "Verify submodule configuration in .gitmodules",
        ],
      },
    );
  }

  try {
    const git = createGit({ cwd: context.repositoryRoot });
    const relativePath = toGitRelativePath(
      context.repositoryRoot,
      submodulePath,
    );

    await git.subModule(["sync", relativePath]);
    logger.debug(`Submodule sync completed for ${submodulePath}`);
  } catch (error) {
    throw new GitOperationError(
      `Failed to sync submodule at ${submodulePath}`,
      {
        cause: error,
        details: { submodulePath },
        suggestions: [
          "Check network connectivity",
          "Verify submodule URL is accessible",
          "Ensure git submodule configuration is valid",
        ],
      },
    );
  }
}

/**
 * Initializes and clones the submodule repository for the first time.
 */
export async function performSubmoduleInit(
  submodulePath: string,
  context: ExecutionContext,
  logger: Logger,
): Promise<void> {
  logger.debug(`Initializing submodule at ${submodulePath}`);

  if (context.dryRun) {
    logger.info(`Would initialize submodule at ${submodulePath}`);
    return;
  }

  const pathExists = await fileExists(submodulePath);
  if (pathExists) {
    const isRepo = await isGitRepository(submodulePath);
    if (isRepo) {
      logger.debug(`Submodule already initialized at ${submodulePath}`);
      return;
    }
  }

  try {
    const git = createGit({ cwd: context.repositoryRoot });
    const relativePath = toGitRelativePath(
      context.repositoryRoot,
      submodulePath,
    );

    await git.subModule(["init", relativePath]);
    await git.subModule(["update", relativePath]);

    logger.debug(`Submodule initialization completed for ${submodulePath}`);
  } catch (error) {
    throw new GitOperationError(
      `Failed to initialize submodule at ${submodulePath}`,
      {
        cause: error,
        details: { submodulePath },
        suggestions: [
          "Check network connectivity",
          "Verify submodule URL in .gitmodules is accessible",
          "Ensure git submodule configuration is valid",
          "Check if submodule path conflicts with existing files",
        ],
      },
    );
  }
}

/**
 * Updates submodule working tree to a specific commit SHA.
 */
export async function performSubmoduleUpdate(
  updateParams: SubmoduleUpdateParams,
): Promise<void> {
  const { submodulePath, targetSha, branchName, context, logger } =
    updateParams;

  logger.debug(`Updating submodule at ${submodulePath} to ${targetSha}`);

  if (context.dryRun) {
    logger.info(`Would update submodule at ${submodulePath} to ${targetSha}`);
    return;
  }

  await validateSubmoduleRepository(submodulePath, targetSha);
  await updateSubmoduleToCommit({
    submodulePath,
    targetSha,
    branchName,
    logger,
  });
}

/**
 * Parameters for submodule update operation.
 */
export interface SubmoduleUpdateParams {
  readonly submodulePath: string;
  readonly targetSha: string;
  readonly branchName: string;
  readonly context: ExecutionContext;
  readonly logger: Logger;
}

/**
 * Parameters for updateSubmoduleToCommit function.
 */
interface SubmoduleCommitParams {
  readonly submodulePath: string;
  readonly targetSha: string;
  readonly branchName: string;
  readonly logger: Logger;
}

/**
 * Validates that the submodule path is a valid git repository.
 */
async function validateSubmoduleRepository(
  submodulePath: string,
  targetSha: string,
): Promise<void> {
  const isRepo = await isGitRepository(submodulePath);
  if (!isRepo) {
    throw new GitOperationError(
      `Submodule path is not a valid git repository: ${submodulePath}`,
      {
        details: { submodulePath, targetSha },
        suggestions: [
          "Initialize the submodule first",
          "Check if the path exists and contains a .git directory",
        ],
      },
    );
  }
}

/**
 * Updates submodule to specific commit using git operations.
 */
async function updateSubmoduleToCommit(
  params: SubmoduleCommitParams,
): Promise<void> {
  const { submodulePath, targetSha, branchName, logger } = params;
  try {
    const git = createGit({ cwd: submodulePath });

    // First try to checkout to branch and merge the SHA (fast-forward only)
    try {
      await git.checkout([branchName]);
      await git.merge([targetSha, "--ff-only"]);
      logger.debug(
        `Successfully updated ${submodulePath} to ${branchName} @ ${targetSha}`,
      );
    } catch (_ffError) {
      // Fall back to detached HEAD checkout
      logger.debug(
        `Fast-forward merge failed for ${submodulePath}, using detached HEAD`,
      );
      await git.checkout([targetSha, "--detach"]);
      logger.debug(`Updated ${submodulePath} to detached HEAD @ ${targetSha}`);
    }
  } catch (error) {
    throw new GitOperationError(
      `Failed to update submodule at ${submodulePath} to ${targetSha}`,
      {
        cause: error,
        details: { submodulePath, targetSha, branchName },
        suggestions: [
          "Check if the commit SHA exists in the repository",
          "Ensure the submodule repository is in a clean state",
          "Verify network connectivity for fetching",
        ],
      },
    );
  }
}
