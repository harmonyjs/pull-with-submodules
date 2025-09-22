/**
 * @fileoverview TTY detection and environment utilities.
 *
 * Provides utilities for detecting whether the application is running in an
 * interactive terminal (TTY) or a non-interactive environment like CI/CD.
 * This determines whether to use spinners, animations, and interactive prompts
 * or fallback to simple text output.
 */

import process from "node:process";

/**
 * Environment capabilities for UI adaptation.
 */
export interface UIEnvironment {
  /** Whether stdout supports interactive features like spinners */
  readonly supportsSpinners: boolean;
  /** Whether environment supports color output */
  readonly supportsColor: boolean;
  /** Whether running in CI environment */
  readonly isCI: boolean;
  /** Whether running in test environment */
  readonly isTest: boolean;
}

/**
 * Detects if running in a CI environment.
 * Checks for common CI environment variables.
 */
function detectCI(): boolean {
  const ciVars = [
    "CI",
    "CONTINUOUS_INTEGRATION",
    "GITHUB_ACTIONS",
    "GITLAB_CI",
    "BUILDKITE",
    "CIRCLECI",
    "TRAVIS",
    "JENKINS_URL",
    "BUILD_NUMBER",
  ];

  return ciVars.some((varName) => Boolean(process.env[varName]));
}

/**
 * Detects if running in test environment.
 */
function detectTest(): boolean {
  return (
    process.env["NODE_ENV"] === "test" ||
    Boolean(process.env["VITEST"]) ||
    Boolean(process.env["JEST_WORKER_ID"]) ||
    typeof (globalThis as Record<string, unknown>)["it"] === "function" // Common test runner globals
  );
}

/**
 * Checks explicit color environment variables.
 */
function checkExplicitColorPreference(): boolean | null {
  const forceColor = process.env["FORCE_COLOR"];
  if (forceColor !== undefined && forceColor !== "") {
    return forceColor !== "0";
  }

  const noColor = process.env["NO_COLOR"];
  const nodeDisableColors = process.env["NODE_DISABLE_COLORS"];
  if (
    (noColor !== undefined && noColor !== "") ||
    (nodeDisableColors !== undefined && nodeDisableColors !== "")
  ) {
    return false;
  }

  return null;
}

/**
 * Checks if CI environment supports color.
 */
function checkCIColorSupport(): boolean {
  if (!detectCI()) {
    return false;
  }

  const githubActions = process.env["GITHUB_ACTIONS"];
  const gitlabCi = process.env["GITLAB_CI"];
  const buildkite = process.env["BUILDKITE"];
  const circleci = process.env["CIRCLECI"];

  return Boolean(
    (githubActions !== undefined && githubActions !== "") ||
      (gitlabCi !== undefined && gitlabCi !== "") ||
      (buildkite !== undefined && buildkite !== "") ||
      (circleci !== undefined && circleci !== ""),
  );
}

/**
 * Checks standard TTY color support.
 */
function checkTTYColorSupport(): boolean {
  const term = process.env["TERM"];
  const colorterm = process.env["COLORTERM"];

  return Boolean(
    process.stdout.isTTY &&
      term !== "dumb" &&
      (colorterm !== undefined ||
        (term !== undefined && term !== "" && term.includes("color"))),
  );
}

/**
 * Detects whether the terminal supports color output.
 */
function detectColorSupport(): boolean {
  // Check explicit color preference first
  const explicitPreference = checkExplicitColorPreference();
  if (explicitPreference !== null) {
    return explicitPreference;
  }

  // Check CI environment support
  if (detectCI()) {
    return checkCIColorSupport();
  }

  // Fall back to standard TTY detection
  return checkTTYColorSupport();
}

/**
 * Gets the current UI environment capabilities.
 *
 * @returns Environment object describing UI capabilities
 * @example
 * const env = getUIEnvironment();
 * if (env.supportsSpinners) {
 *   // Use spinners
 * } else {
 *   // Use simple text output
 * }
 */
export function getUIEnvironment(): UIEnvironment {
  const isCI = detectCI();
  const isTest = detectTest();
  const hasTTY = process.stdout.isTTY;

  return {
    supportsSpinners: hasTTY && !isCI && !isTest,
    supportsColor: detectColorSupport(),
    isCI,
    isTest,
  };
}

/**
 * Checks if the current environment supports interactive features.
 *
 * @returns true if environment supports spinners and interactive prompts
 */
export function isInteractiveEnvironment(): boolean {
  return getUIEnvironment().supportsSpinners;
}

/**
 * Checks if the current environment is non-interactive (CI/test/non-TTY).
 *
 * @returns true if environment should use simple text output
 */
export function isNonInteractiveEnvironment(): boolean {
  return !isInteractiveEnvironment();
}
