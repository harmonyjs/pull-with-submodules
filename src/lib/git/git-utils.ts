/**
 * @fileoverview Git utility functions for common operations.
 *
 * Provides utility functions for staging files and creating commits.
 * These are extracted from operations.ts to keep file sizes manageable.
 */

import { asGitSha } from "./sha-utils.js";
import { createGit, type GitOperationConfig } from "./core.js";
import type { GitSha } from "#types/git";

/**
 * Stage files in the working directory.
 *
 * @param paths - Array of file paths to stage
 * @param config - Git operation configuration
 * @throws Error if staging fails
 *
 * @example
 * ```typescript
 * await stageFiles(['path/to/file'], { cwd: '/path/to/repo' });
 * ```
 */
export async function stageFiles(
  paths: readonly string[],
  config: GitOperationConfig = {},
): Promise<void> {
  if (paths.length === 0) {
    config.logger?.debug("No files to stage");
    return;
  }

  const pathList = paths.join(", ");
  config.logger?.debug(
    `staging files: ${pathList} in ${config.cwd ?? process.cwd()}`,
  );

  if (config.dryRun === true) {
    config.logger?.info(`Stage files: ${pathList} (dry-run)`);
    return;
  }

  const git = createGit(config);

  try {
    await git.add(paths as string[]);
    config.logger?.debug(`Staged ${paths.length} file(s)`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to stage files [${pathList}]: ${errorMessage}`);
  }
}

/**
 * Create a commit with the specified message.
 *
 * @param message - Commit message
 * @param config - Git operation configuration
 * @returns Promise resolving to the created commit SHA
 * @throws Error if commit creation fails
 *
 * @example
 * ```typescript
 * const sha = await createCommit('feat: add new feature', { cwd: '/path/to/repo' });
 * ```
 */
export async function createCommit(
  message: string,
  config: GitOperationConfig = {},
): Promise<GitSha> {
  if (message.trim() === "") {
    throw new Error("Commit message cannot be empty");
  }

  config.logger?.debug(
    `creating commit: "${message}" in ${config.cwd ?? process.cwd()}`,
  );

  if (config.dryRun === true) {
    config.logger?.info(`Create commit: "${message}" (dry-run)`);
    // Return a mock SHA for dry-run mode
    return asGitSha("0000000000000000000000000000000000000000");
  }

  const git = createGit(config);

  try {
    const result = await git.commit(message);
    const sha = result.commit;
    config.logger?.debug(`Created commit ${sha}`);
    return asGitSha(sha);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create commit: ${errorMessage}`);
  }
}
