/**
 * @fileoverview Sibling repository discovery module.
 *
 * Discovers and validates local development copies of submodule repositories
 * located in parent directory. Supports smart source selection by preferring
 * local siblings when they contain all remote commits.
 *
 * Expected project structure:
 * ```
 * workspace/
 * ├── main-project/          # Main repository
 * │   ├── .gitmodules
 * │   └── libs/
 * │       └── shared/        # Submodule checkout
 * │
 * └── shared/                # Local development copy (auto-discovered)
 * ```
 */

import { dirname, join, basename } from "node:path";
import { extractRepoName } from "#lib/git/url-parser.js";
import { isGitRepository } from "#lib/git/repository-validator.js";
import { getCommitSha } from "#lib/git/commit-utils.js";
import type { RepositoryCache } from "#lib/git/cache.js";
import type { GitSha } from "#types/git.js";
import type { GitOperationConfig } from "#lib/git/core.js";
import type { Logger } from "#ui/logger.js";

/**
 * Describes a discovered sibling repository and its state.
 */
export interface SiblingRepository {
  /** Absolute path to the sibling repository. */
  readonly path: string;
  /** Repository name derived from URL or path. */
  readonly name: string;
  /** Whether the path exists and is a valid git repository. */
  readonly isValid: boolean;
  /** Commit SHA for the specified branch (null if invalid or branch not found). */
  readonly commitSha: GitSha | null;
}

/**
 * Options for sibling repository discovery.
 */
export interface SiblingDiscoveryOptions {
  /** Submodule repository path (containing .git/gitmodules). */
  readonly submodulePath: string;
  /** Submodule remote URL for name extraction. */
  readonly remoteUrl: string;
  /** Branch to resolve commit SHA for. */
  readonly branch: string;
  /** Git operation configuration (dry-run, verbose, etc.). */
  readonly gitConfig?: GitOperationConfig;
  /** Optional cache for repository validation results. */
  readonly cache?: RepositoryCache;
  /** Optional logger for debug output. */
  readonly logger?: Logger;
}

/**
 * Generate candidate repository paths for sibling discovery.
 */
function generateCandidatePaths(
  submodulePath: string,
  remoteUrl: string,
  logger?: Logger,
): Array<{ name: string; path: string }> {
  const submoduleParent = dirname(submodulePath);
  const repoRoot = dirname(submoduleParent);
  const repoName = extractRepoName(remoteUrl);
  const pathBasename = basename(submodulePath);

  const candidates = [{ name: repoName, path: join(repoRoot, repoName) }];

  // Add path-based candidate if different from URL-based name
  if (pathBasename !== repoName) {
    candidates.push({ name: pathBasename, path: join(repoRoot, pathBasename) });
  }

  logger?.debug(
    `Generated ${candidates.length} candidate paths for sibling discovery:`,
    candidates.map((c) => c.path),
  );

  return candidates;
}

/**
 * Find first valid repository from candidates.
 */
async function findValidCandidate(
  candidates: Array<{ name: string; path: string }>,
  cache?: RepositoryCache,
  logger?: Logger,
): Promise<{ name: string; path: string } | null> {
  logger?.debug(
    `Checking ${candidates.length} candidate repositories for validity`,
  );

  for (const candidate of candidates) {
    const cached = cache?.get(candidate.path);
    let isValid: boolean;

    if (cached !== undefined) {
      logger?.debug(
        `Cache hit for ${candidate.path}: ${cached ? "valid" : "invalid"}`,
      );
      isValid = cached;
    } else {
      isValid = await isGitRepository(candidate.path, cache);
      logger?.debug(
        `Validated ${candidate.path}: ${isValid ? "valid" : "invalid"}`,
      );
    }

    if (isValid) {
      return candidate;
    }
  }

  return null;
}

/**
 * Create sibling repository result with commit SHA.
 */
async function createSiblingResult(options: {
  candidate: { name: string; path: string };
  branch: string;
  gitConfig?: GitOperationConfig;
  logger?: Logger;
}): Promise<SiblingRepository> {
  const { candidate, branch, gitConfig, logger } = options;

  logger?.debug(
    `Found valid sibling repository: ${candidate.name} at ${candidate.path}`,
  );
  logger?.debug(
    `Resolving commit SHA for branch '${branch}' in ${candidate.path}`,
  );

  const commitSha = await getCommitSha(candidate.path, branch, gitConfig);

  if (commitSha) {
    logger?.debug(`Resolved ${branch} to ${commitSha} in ${candidate.name}`);
  } else {
    logger?.debug(`Branch '${branch}' not found in ${candidate.name}`);
  }

  return {
    path: candidate.path,
    name: candidate.name,
    isValid: true,
    commitSha,
  };
}

/**
 * Find and validate a sibling repository for a submodule.
 *
 * Searches for local development copies in the parent workspace directory,
 * using both URL-derived names and path-based names as candidates.
 *
 * @param options - Configuration with paths, Git operations, and optional cache/logger
 * @returns Sibling repository info or null if none found
 * @example
 * ```ts
 * const cache = new InMemoryRepositoryCache();
 * const sibling = await findSiblingRepository({
 *   submodulePath: '/workspace/main/libs/shared',
 *   remoteUrl: 'https://github.com/org/shared-utils.git',
 *   branch: 'main',
 *   gitConfig: { dryRun: false, verbose: true },
 *   cache,
 *   logger: createLogger(context)
 * });
 * ```
 */
export async function findSiblingRepository(
  options: SiblingDiscoveryOptions,
): Promise<SiblingRepository | null> {
  const { submodulePath, remoteUrl, branch, gitConfig, cache, logger } = options;

  logger?.debug(
    `Starting sibling discovery for ${basename(submodulePath)} (${remoteUrl})`,
  );

  const candidates = generateCandidatePaths(submodulePath, remoteUrl, logger);
  const validCandidate = await findValidCandidate(candidates, cache, logger);

  if (!validCandidate) {
    logger?.debug("No sibling repository found");
    return null;
  }

  return createSiblingResult({
    candidate: validCandidate,
    branch,
    ...(gitConfig && { gitConfig }),
    ...(logger && { logger }),
  });
}
