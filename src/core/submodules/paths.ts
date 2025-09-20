/**
 * @fileoverview Utilities for submodule path normalization.
 *
 * Provides helpers to enforce the invariant that Submodule.path is relative
 * to the repository root and to compute absolute paths safely.
 */

import {
  join,
  isAbsolute,
  relative as pathRelative,
  sep as pathSep,
} from "node:path";
import type { ExecutionContext, Submodule } from "#types/core";

/**
 * Enforces path consistency by converting absolute paths to relative.
 *
 * This is necessary because git expects relative paths but .gitmodules
 * might contain absolute paths from incorrect configuration.
 */
export function resolveSubmodulePaths(
  submodule: Submodule,
  context: ExecutionContext,
): { absolutePath: string; normalizedSubmodule: Submodule } {
  const normalizedRelative = isAbsolute(submodule.path)
    ? pathRelative(context.repositoryRoot, submodule.path)
    : submodule.path;

  const absolutePath = join(context.repositoryRoot, normalizedRelative);
  const normalizedSubmodule =
    normalizedRelative === submodule.path
      ? submodule
      : { ...submodule, path: normalizedRelative };

  return { absolutePath, normalizedSubmodule };
}

/**
 * Converts paths to git's expected format with forward slashes.
 *
 * Git internals always use forward slashes, even on Windows, so we must
 * convert platform-specific path separators to ensure compatibility.
 */
export function toGitRelativePath(
  repositoryRoot: string,
  absolutePath: string,
): string {
  const rel = pathRelative(repositoryRoot, absolutePath);
  return pathSep === "/" ? rel : rel.split(pathSep).join("/");
}
