/**
 * @fileoverview Barrel for git utilities module.
 *
 * Provides low-level Git operations for repository inspection,
 * ancestry checks, and .gitmodules file parsing.
 */

export {
  createGit,
  isAncestor,
  getBranchName,
  isWorkingDirectoryClean,
  getMergeBase,
  type AncestryCheckResult,
  type GitOperationConfig,
} from "./core.js";

export {
  pullWithRebase,
  fetchRemotes,
  getCommitSha,
  getWorkingTreeStatus,
  type PullResult,
} from "./operations.js";

export {
  parseGitmodules,
  readGitmodules,
  type SubmoduleEntry,
  type GitmodulesParseConfig,
} from "./gitmodules.js";

export { isValidSha, isGitSha, asGitSha } from "./sha-utils.js";

export { extractRepoName } from "./url-parser.js";

export { isGitRepository } from "./repository-validator.js";

export { InMemoryRepositoryCache, type RepositoryCache } from "./cache.js";
