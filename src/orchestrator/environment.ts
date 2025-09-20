/**
 * @fileoverview Environment validation utilities.
 *
 * Validates the execution environment (Git installation, Node version)
 * and locates the repository root directory for subsequent operations.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { dirname } from "node:path";
import { findUpSync } from "find-up-simple";

import { isGitRepository } from "#lib/git";
import { GitOperationError } from "#errors";

const execAsync = promisify(exec);

/**
 * Minimum required versions for runtime dependencies.
 */
const MIN_VERSIONS = {
  git: "2.13.0",
  node: "22.0.0",
} as const;

/**
 * Environment validation result.
 */
export interface EnvironmentValidation {
  readonly gitVersion: string;
  readonly nodeVersion: string;
  readonly repositoryRoot: string;
}

/**
 * Validates the execution environment and locates repository root.
 *
 * @param currentWorkingDirectory - Starting directory for repository search
 * @returns Promise resolving to validation result
 * @throws GitOperationError when environment is invalid or repository not found
 */
export async function validateEnvironment(
  currentWorkingDirectory: string = process.cwd()
): Promise<EnvironmentValidation> {
  // Validate Node.js version
  const nodeVersion = process.version.slice(1); // Remove 'v' prefix
  if (!isVersionSufficient(nodeVersion, MIN_VERSIONS.node)) {
    throw new GitOperationError(
      `Node.js ${MIN_VERSIONS.node}+ required, found ${nodeVersion}`,
      {
        cause: new Error("Insufficient Node.js version"),
        suggestions: [`Please upgrade to Node.js ${MIN_VERSIONS.node} or later`],
      }
    );
  }

  // Validate Git installation and version
  const gitVersion = await getGitVersion();
  if (!isVersionSufficient(gitVersion, MIN_VERSIONS.git)) {
    throw new GitOperationError(
      `Git ${MIN_VERSIONS.git}+ required, found ${gitVersion}`,
      {
        cause: new Error("Insufficient Git version"),
        suggestions: [`Please upgrade to Git ${MIN_VERSIONS.git} or later`],
      }
    );
  }

  // Locate repository root
  const repositoryRoot = await findRepositoryRoot(currentWorkingDirectory);

  return {
    gitVersion,
    nodeVersion,
    repositoryRoot,
  };
}

/**
 * Retrieves Git version from the system.
 *
 * @returns Promise resolving to Git version string
 * @throws GitOperationError when Git is not installed or accessible
 */
async function getGitVersion(): Promise<string> {
  try {
    const { stdout } = await execAsync("git --version");
    const match = stdout.match(/git version (\d+\.\d+\.\d+)/);

    if (match === null || match[1] === undefined) {
      throw new Error("Unable to parse Git version output");
    }

    return match[1];
  } catch (error) {
    throw new GitOperationError(
      "Git version detection failed",
      {
        cause: error as Error,
        suggestions: ["Ensure Git is installed and accessible in PATH"],
      }
    );
  }
}

/**
 * Locates the Git repository root directory.
 *
 * @param startingDirectory - Directory to start searching from
 * @returns Promise resolving to absolute path of repository root
 * @throws GitOperationError when repository is not found or invalid
 */
async function findRepositoryRoot(startingDirectory: string): Promise<string> {
  // Find .git directory - specify type: 'directory' to find directories
  const gitDir = findUpSync(".git", { cwd: startingDirectory, type: "directory" });

  if (gitDir === undefined) {
    throw new GitOperationError(
      "Not a git repository (or any of the parent directories)",
      {
        cause: new Error("Repository detection failed"),
        suggestions: ["Initialize git repository with 'git init'", "Navigate to a git repository directory"],
      }
    );
  }

  const repositoryRoot = dirname(gitDir);

  // Validate it's a proper Git repository
  if (!(await isGitRepository(repositoryRoot))) {
    throw new GitOperationError(
      "Directory contains .git but is not a valid repository",
      {
        cause: new Error("Repository validation failed"),
        suggestions: ["Check repository integrity", "Reinitialize repository if corrupted"],
      }
    );
  }

  return repositoryRoot;
}

/**
 * Compares version strings for sufficiency check.
 *
 * @param current - Current version string (e.g., "2.44.0")
 * @param required - Required minimum version (e.g., "2.13.0")
 * @returns True if current version meets or exceeds requirement
 */
function isVersionSufficient(current: string, required: string): boolean {
  const currentParts = current.split(".").map(Number);
  const requiredParts = required.split(".").map(Number);

  for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
    const currentPart = currentParts[i];
    const requiredPart = requiredParts[i];

    const currentValue = Number.isNaN(currentPart) ? 0 : (currentPart ?? 0);
    const requiredValue = Number.isNaN(requiredPart) ? 0 : (requiredPart ?? 0);

    if (currentValue > requiredValue) return true;
    if (currentValue < requiredValue) return false;
  }

  return true; // Versions are equal
}