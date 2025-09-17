/**
 * @fileoverview Factory for creating ancestry checker implementations.
 *
 * Provides abstraction layer between strategies and Git operations,
 * enabling dependency injection and testability.
 */

import { isAncestor, type AncestryCheckResult } from "../../lib/git/core.js";

/**
 * Dependency injection interface for ancestry checking.
 * Allows for easy testing by mocking git operations.
 */
export interface AncestryChecker {
  /**
   * Check if one commit is an ancestor of another.
   *
   * @param ancestor - The potential ancestor commit SHA
   * @param descendant - The potential descendant commit SHA
   * @returns Promise resolving to ancestry check result
   */
  isAncestor(ancestor: string, descendant: string): Promise<AncestryCheckResult>;
}

/**
 * Creates an ancestry checker that uses real git operations.
 *
 * @param cwd - Working directory for git operations
 * @returns Ancestry checker instance
 */
export function createGitAncestryChecker(cwd?: string): AncestryChecker {
  return {
    async isAncestor(ancestor: string, descendant: string): Promise<AncestryCheckResult> {
      const config = cwd !== undefined ? { cwd } : {};
      return isAncestor(ancestor, descendant, config);
    },
  };
}

/**
 * Creates a mock ancestry checker for testing.
 *
 * @param mockResults - Map of "ancestor->descendant" to result
 * @returns Mock ancestry checker
 */
export function createMockAncestryChecker(
  mockResults: Map<string, boolean>
): AncestryChecker {
  return {
    async isAncestor(ancestor: string, descendant: string): Promise<AncestryCheckResult> {
      const key = `${ancestor}->${descendant}`;
      const isAncestor = mockResults.get(key) ?? false;
      return Promise.resolve({ isAncestor, details: "mock result" });
    },
  };
}