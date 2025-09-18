/**
 * @fileoverview Git URL parsing utilities.
 *
 * Provides functions for parsing and extracting information from Git repository URLs,
 * supporting various formats including HTTPS, SSH, and local paths.
 */

import { GitOperationError } from "#errors/index.js";

/**
 * Git file extension suffix.
 */
const GIT_SUFFIX = ".git" as const;

/**
 * Extract repository name from various Git URL formats.
 *
 * Supports common Git URL patterns:
 * - HTTPS: https://github.com/user/repo.git → repo
 * - SSH: git@github.com:user/repo.git → repo
 * - Local: /path/to/repo → repo
 * - Local with .git: /path/to/repo.git → repo
 *
 * @param url - Git repository URL or path
 * @returns Repository name without .git suffix
 * @throws {GitOperationError} When URL is empty or invalid
 * @example
 * ```ts
 * extractRepoName('https://github.com/user/my-repo.git') // 'my-repo'
 * extractRepoName('git@gitlab.com:org/project.git')     // 'project'
 * extractRepoName('/Users/dev/workspace/service')       // 'service'
 * ```
 */
export function extractRepoName(url: string): string {
  if (url.trim() === "") {
    throw new GitOperationError("Repository URL cannot be empty", {});
  }

  // Normalize URL by removing trailing slashes
  let repoName = url.trim().replace(/\/$/, "");

  // Extract the last path component after '/' or ':'
  const lastSlashIndex = Math.max(
    repoName.lastIndexOf("/"),
    repoName.lastIndexOf(":"),
  );

  if (lastSlashIndex >= 0) {
    repoName = repoName.substring(lastSlashIndex + 1);
  }

  // Remove .git suffix if present
  if (repoName.endsWith(GIT_SUFFIX)) {
    repoName = repoName.slice(0, -GIT_SUFFIX.length);
  }

  if (repoName.length === 0) {
    throw new GitOperationError(
      `Cannot extract repository name from URL: ${url}`,
      {
        suggestions: [
          "Ensure URL follows standard Git format",
          "Check that URL contains a valid repository path",
        ],
      },
    );
  }

  return repoName;
}
