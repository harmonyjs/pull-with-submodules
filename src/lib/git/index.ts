/**
 * @fileoverview Barrel for git utilities module.
 *
 * Provides low-level Git operations for repository inspection,
 * ancestry checks, and .gitmodules file parsing.
 */

export {
  createGit,
  isAncestor,
  getCommitSha,
  getBranchName,
  isWorkingDirectoryClean,
  getMergeBase,
  isGitRepository,
  type AncestryCheckResult,
  type GitOperationConfig,
} from "./core.js";

export {
  parseGitmodules,
  readGitmodules,
  type SubmoduleEntry,
  type GitmodulesParseConfig,
} from "./gitmodules.js";
