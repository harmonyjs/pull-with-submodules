/**
 * @fileoverview Core filesystem utilities for safe file operations.
 *
 * Provides security-hardened filesystem access with path traversal
 * protection and common file/directory checks.
 */

import { access, stat } from "node:fs/promises";
import { resolve, isAbsolute, sep } from "node:path";
import { constants } from "node:fs";

/**
 * Checks if a file exists and is accessible.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a path exists and is a directory.
 */
export async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stats = await stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Safely resolves a path to absolute form without directory traversal vulnerabilities.
 *
 * Prevents path traversal attacks by ensuring resolved paths stay within
 * the specified base directory.
 *
 * @param targetPath - Path to resolve (relative or absolute)
 * @param baseDir - Base directory to resolve against
 * @returns Absolute path within base directory
 * @throws Error if path resolves outside base directory
 */
export function resolveAbsolutePath(
  targetPath: string,
  baseDir: string = process.cwd(),
): string {
  const resolvedBase = resolve(baseDir);
  const resolvedTarget = isAbsolute(targetPath)
    ? resolve(targetPath)
    : resolve(resolvedBase, targetPath);

  if (
    !resolvedTarget.startsWith(resolvedBase + sep) &&
    resolvedTarget !== resolvedBase
  ) {
    throw new Error(
      `Path '${targetPath}' resolves outside base directory '${baseDir}'`,
    );
  }

  return resolvedTarget;
}
