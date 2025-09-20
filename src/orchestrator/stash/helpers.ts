/**
 * @fileoverview Helper utilities for stash operations.
 *
 * Contains validation and error handling functions used by the main
 * stash operations for robust stash management.
 */

import { createGit, type GitOperationConfig } from "#lib/git";
import { GitOperationError } from "#errors";

/**
 * Checks if a stash reference exists in the repository.
 *
 * @param stashRef - Stash reference to check (e.g., "stash@{0}")
 * @param config - Git operation configuration
 * @returns Promise resolving to true if stash exists
 * @throws GitOperationError if git operation fails
 */
export async function stashExists(
  stashRef: string,
  config: GitOperationConfig = {}
): Promise<boolean> {
  validateStashReference(stashRef);

  const git = createGit(config);

  try {
    // Try to show the stash - if it exists, this will succeed
    await git.raw(['stash', 'show', stashRef, '--stat']);
    return true;
  } catch (error) {
    // If stash doesn't exist, git will exit with error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('not a valid reference')) {
      return false;
    }

    // Other errors are unexpected and should be thrown
    config.logger?.debug(`Unexpected error checking stash existence: ${errorMessage}`);
    return false; // Assume doesn't exist for safety
  }
}

/**
 * Validates stash reference format.
 *
 * @param stashRef - Stash reference to validate
 * @throws GitOperationError if reference format is invalid
 */
export function validateStashReference(stashRef: string): void {
  if (stashRef.length === 0 || stashRef.trim().length === 0) {
    throw new GitOperationError(
      'Stash reference cannot be empty',
      {
        cause: new Error('Invalid stash reference'),
        suggestions: ['Provide a valid stash reference like "stash@{0}"'],
      }
    );
  }

  // Basic format validation - should be like "stash@{n}" or just a SHA
  const isValidFormat = /^(stash@\{\d+\}|[a-f0-9]{7,40})$/i.test(stashRef.trim());

  if (!isValidFormat) {
    throw new GitOperationError(
      `Invalid stash reference format: ${stashRef}`,
      {
        cause: new Error('Malformed stash reference'),
        suggestions: [
          'Use format "stash@{0}" for latest stash',
          'Use format "stash@{n}" for specific stash number',
          'Use a valid commit SHA',
        ],
      }
    );
  }
}

/**
 * Handles stash restore errors with descriptive error messages.
 *
 * @param error - Original error from git operation
 * @param stashRef - Stash reference that failed to restore
 * @throws GitOperationError with helpful suggestions
 */
export function handleStashRestoreError(error: unknown, stashRef: string): never {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (errorMessage.includes('conflict') || errorMessage.includes('merge')) {
    throw new GitOperationError(
      `Stash restore conflicts detected for ${stashRef}`,
      {
        cause: error as Error,
        suggestions: [
          'Resolve conflicts manually',
          'Use "git stash drop" to discard the stash if conflicts are too complex',
          'Commit current changes before restoring stash',
        ],
      }
    );
  }

  if (errorMessage.includes('not a valid reference')) {
    throw new GitOperationError(
      `Stash ${stashRef} no longer exists`,
      {
        cause: error as Error,
        suggestions: [
          'Check available stashes with "git stash list"',
          'The stash may have been already applied or dropped',
        ],
      }
    );
  }

  // Generic error
  throw new GitOperationError(
    `Failed to restore stash ${stashRef}`,
    {
      cause: error as Error,
      suggestions: [
        'Check repository state',
        'Ensure working directory is clean before restoring',
        'Use "git status" to check for uncommitted changes',
      ],
    }
  );
}