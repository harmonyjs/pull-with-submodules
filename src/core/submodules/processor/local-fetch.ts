/**
 * @fileoverview Local repository fetch utilities for submodule updates.
 *
 * Provides functionality to fetch commits from local sibling repositories,
 * making unpushed commits available in submodule repositories for updates.
 *
 * CRITICAL: This module solves the fundamental problem where submodules
 * cannot access unpushed commits from local development repositories.
 * Without this functionality, pull-with-submodules would fail when trying
 * to update submodules to commits that exist only locally.
 */

import { createGit } from "#lib/git/core";
import type { ExecutionContext } from "#types/core";
import type { Logger } from "#ui/logger";

/**
 * Parameters for local sibling fetch operation.
 */
export interface LocalFetchParams {
  /** Absolute path to the local sibling repository */
  readonly localPath: string;
  /** The commit SHA we need to fetch */
  readonly targetSha: string;
  /** Path to the submodule repository */
  readonly submodulePath: string;
  /** Execution context for dry-run mode */
  readonly context: ExecutionContext;
  /** Logger for debug output */
  readonly logger: Logger;
}

/**
 * Fetches commits from a local sibling repository to make them available in the submodule.
 *
 * This function is essential when the selected commit comes from a local development repository
 * that has unpushed changes. Without this fetch, the submodule won't have access to the
 * target commit, causing the update to fail.
 *
 * The approach:
 * 1. Add the local sibling path as a temporary remote
 * 2. Fetch from that remote to bring in unpushed commits
 * 3. Clean up the temporary remote
 */
export async function fetchFromLocalSibling(
  params: LocalFetchParams,
): Promise<void> {
  const { localPath, targetSha, submodulePath, context, logger } = params;

  logger.verbose(
    `Fetching unpushed commit ${targetSha} from local sibling at ${localPath}`,
  );

  if (context.dryRun) {
    logger.info(
      `Would fetch commit ${targetSha} from local sibling ${localPath} (dry-run)`,
    );
    return;
  }

  await performFetchOperation({ localPath, targetSha, submodulePath, logger });
}

/**
 * Performs the actual fetch operation with temporary remote.
 */
async function performFetchOperation(params: {
  localPath: string;
  targetSha: string;
  submodulePath: string;
  logger: Logger;
}): Promise<void> {
  const { localPath, targetSha, submodulePath, logger } = params;
  const tempRemoteName = "temp-local-sibling";
  const git = createGit({ cwd: submodulePath });

  try {
    await addTemporaryRemote({
      git,
      remoteName: tempRemoteName,
      localPath,
      logger,
    });
    await fetchFromRemote({
      git,
      remoteName: tempRemoteName,
      targetSha,
      logger,
    });
  } catch (error) {
    handleFetchError(error, localPath, logger);
  } finally {
    await cleanupTemporaryRemote(git, tempRemoteName, logger);
  }
}

/**
 * Adds a temporary remote pointing to the local sibling repository.
 */
async function addTemporaryRemote(params: {
  git: ReturnType<typeof createGit>;
  remoteName: string;
  localPath: string;
  logger: Logger;
}): Promise<void> {
  const { git, remoteName, localPath, logger } = params;
  logger.verbose(
    `Adding temporary remote '${remoteName}' pointing to ${localPath}`,
  );
  await git.addRemote(remoteName, `file://${localPath}`);
}

/**
 * Fetches from the temporary remote to get unpushed commits.
 *
 * CRITICAL IMPLEMENTATION NOTE:
 * - DO NOT use `git.fetch(remoteName)` without refspec - it may not fetch all commits
 * - DO NOT use default fetch behavior - it can miss unpushed commits
 * - ALWAYS use explicit refspec `+refs/heads/*:refs/remotes/{remote}/*`
 * - ALWAYS verify commit availability after fetch
 *
 * This pattern prevents the common bug where fetch appears successful
 * but the target commit remains unavailable.
 */
async function fetchFromRemote(params: {
  git: ReturnType<typeof createGit>;
  remoteName: string;
  targetSha: string;
  logger: Logger;
}): Promise<void> {
  const { git, remoteName, targetSha, logger } = params;
  logger.verbose(
    `Fetching from temporary remote '${remoteName}' to get commit ${targetSha}`,
  );

  // CRITICAL: Fetch all refs from the local repository to ensure we get unpushed commits
  // Using explicit refspec to map all remote heads to our temporary remote namespace
  // Without this refspec, git.fetch() may not retrieve the needed commits
  const refspec = `+refs/heads/*:refs/remotes/${remoteName}/*`;
  logger.verbose(`Using refspec: ${refspec}`);

  await git.fetch([remoteName, refspec]);
  logger.verbose(`Successfully fetched all refs from local sibling`);

  // CRITICAL: Verify the target commit is now available
  // This prevents silent failures where fetch completes but commit is missing
  await verifyCommitAvailable(git, targetSha, logger);
}

/**
 * Verifies that the target commit is available after fetch.
 */
async function verifyCommitAvailable(
  git: ReturnType<typeof createGit>,
  targetSha: string,
  logger: Logger,
): Promise<void> {
  try {
    // Try to get the commit object to verify it exists
    await git.catFile(["-t", targetSha]);
    logger.verbose(`Verified commit ${targetSha} is now available`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(
      `Commit ${targetSha} not found after fetch: ${errorMessage}. The submodule update may fail.`,
    );
    // Don't throw - let the subsequent update operation handle the missing commit
  }
}

/**
 * Handles fetch operation errors with appropriate logging.
 */
function handleFetchError(
  error: unknown,
  localPath: string,
  logger: Logger,
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.warn(
    `Failed to fetch from local sibling ${localPath}: ${errorMessage}`,
  );
  // Don't throw here - let the caller handle the missing commit
}

/**
 * Cleans up the temporary remote after the fetch operation.
 */
async function cleanupTemporaryRemote(
  git: ReturnType<typeof createGit>,
  remoteName: string,
  logger: Logger,
): Promise<void> {
  try {
    logger.verbose(`Removing temporary remote '${remoteName}'`);
    await git.removeRemote(remoteName);
  } catch (cleanupError) {
    const cleanupMessage =
      cleanupError instanceof Error
        ? cleanupError.message
        : String(cleanupError);
    logger.warn(
      `Failed to remove temporary remote '${remoteName}': ${cleanupMessage}`,
    );
  }
}
