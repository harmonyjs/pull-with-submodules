/**
 * @fileoverview Parser for Git .gitmodules configuration files.
 *
 * Provides structured parsing of .gitmodules files with validation,
 * error handling, and path resolution capabilities.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import debug from "debug";
import { fileExists, resolveAbsolutePath } from "#lib/fs/core.js";

const gitmodulesDebug = debug("pull-with-submodules:gitmodules");

const VALID_SUBMODULE_KEYS = ["path", "url", "branch"];
const NEXT_SECTION_INCREMENT = 1;
const ARRAY_INDEX_OFFSET = 1;
const MIN_REQUIRED_ELEMENTS = 2;

export interface SubmoduleEntry {
  readonly name: string;
  readonly path: string;
  readonly url: string;
  readonly branch?: string;
}

export interface GitmodulesParseConfig {
  /** Skip invalid submodule entries instead of throwing (default: true) */
  readonly skipInvalid: boolean;
  /** Resolve paths to absolute form using baseDir (default: false) */
  readonly resolveAbsolute: boolean;
  /** Base directory for path resolution (default: file directory) */
  readonly baseDir?: string;
}

/**
 * Parses .gitmodules file content into structured submodule entries.
 *
 * @param content - Raw .gitmodules file content
 * @param config - Parse configuration options
 * @returns Array of parsed submodule entries
 */
export function parseGitmodules(
  content: string,
  config: Partial<GitmodulesParseConfig> = {},
): SubmoduleEntry[] {
  const mergedConfig = {
    skipInvalid: true,
    resolveAbsolute: false,
    ...config,
  };

  return parseGitmodulesContent(content, mergedConfig);
}

/**
 * Reads and parses a .gitmodules file, resolving paths relative to the file location.
 *
 * @param filePath - Path to .gitmodules file (default: ".gitmodules")
 * @param config - Parse configuration options
 * @returns Promise resolving to array of parsed submodule entries
 * @throws Error if file doesn't exist or is malformed
 */
export async function readGitmodules(
  filePath = ".gitmodules",
  config: Partial<GitmodulesParseConfig> = {},
): Promise<SubmoduleEntry[]> {
  const exists = await fileExists(filePath);
  if (exists === false) {
    throw new Error(`Gitmodules file not found at '${filePath}'`);
  }

  const content = await readFile(filePath, "utf8");
  const resolvedBaseDir = config.baseDir ?? resolve(filePath, "..");

  return parseGitmodules(content, {
    ...config,
    baseDir: resolvedBaseDir,
  });
}

function shouldSkipLine(line: string): boolean {
  return line === "" || line.startsWith("#");
}

function extractSubmoduleName(line: string): string | null {
  const sectionMatch = line.match(/^\[submodule\s+"([^"]+)"\]$/);
  if (!sectionMatch || (sectionMatch[ARRAY_INDEX_OFFSET] ?? "") === "") {
    return null;
  }
  return sectionMatch[ARRAY_INDEX_OFFSET] ?? "";
}

function processSubmoduleEntry(
  name: string,
  submoduleData: Record<string, string>,
  options: { skipInvalid: boolean; resolveAbsolute: boolean; baseDir?: string },
): SubmoduleEntry | null {
  try {
    return createSubmoduleEntry(name, submoduleData, options);
  } catch (error) {
    if (!options.skipInvalid) {
      throw error;
    }
    return null;
  }
}

function parseGitmodulesContent(
  content: string,
  options: { skipInvalid: boolean; resolveAbsolute: boolean; baseDir?: string },
): SubmoduleEntry[] {
  const submodules: SubmoduleEntry[] = [];
  const lines = content.split("\n").map((line) => line.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (shouldSkipLine(line)) continue;

    const name = extractSubmoduleName(line);
    if (name === null) continue;

    const submoduleData = parseSubmoduleSection(
      lines,
      i + NEXT_SECTION_INCREMENT,
    );
    const entry = processSubmoduleEntry(name, submoduleData, options);

    if (entry) {
      submodules.push(entry);
    }

    i =
      findNextSection(lines, i + NEXT_SECTION_INCREMENT) -
      NEXT_SECTION_INCREMENT;
  }

  return submodules;
}

function isValidKeyValuePair(kvMatch: RegExpMatchArray | null): boolean {
  return Boolean(
    kvMatch &&
      (kvMatch[ARRAY_INDEX_OFFSET] ?? "") !== "" &&
      (kvMatch[MIN_REQUIRED_ELEMENTS] ?? "") !== "" &&
      VALID_SUBMODULE_KEYS.includes(kvMatch[ARRAY_INDEX_OFFSET] ?? ""),
  );
}

function parseSubmoduleSection(
  lines: string[],
  startIndex: number,
): Record<string, string> {
  const submodule: Record<string, string> = {};

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line === "" || line.startsWith("#")) continue;
    if (line.startsWith("[")) break;

    const kvMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (isValidKeyValuePair(kvMatch) && kvMatch) {
      const key = kvMatch[ARRAY_INDEX_OFFSET] ?? "";
      const value = kvMatch[MIN_REQUIRED_ELEMENTS] ?? "";
      submodule[key] = value;
    }
  }

  return submodule;
}

function findNextSection(lines: string[], startIndex: number): number {
  for (let i = startIndex; i < lines.length; i++) {
    if ((lines[i] ?? "").startsWith("[")) return i;
  }
  return lines.length;
}

function validateSubmoduleData(
  name: string,
  pathValue?: string,
  urlValue?: string,
): void {
  if ((pathValue ?? "").length === 0 || (urlValue ?? "").length === 0) {
    throw new Error(`Missing required fields for submodule '${name}'`);
  }
}

function resolveFinalPath(
  pathValue: string,
  name: string,
  options: { resolveAbsolute: boolean; baseDir?: string },
): string {
  if (!options.resolveAbsolute || (options.baseDir ?? "") === "") {
    return pathValue;
  }

  try {
    return resolveAbsolutePath(pathValue, options.baseDir);
  } catch (error) {
    gitmodulesDebug(
      `Failed to resolve absolute path for submodule '${name}': ${error instanceof Error ? error.message : String(error)}`,
    );
    return pathValue;
  }
}

function createSubmoduleEntry(
  name: string,
  data: Record<string, string>,
  options: { resolveAbsolute: boolean; baseDir?: string },
): SubmoduleEntry {
  const pathValue = data["path"];
  const urlValue = data["url"];
  const branchValue = data["branch"];

  validateSubmoduleData(name, pathValue, urlValue);
  const finalPath = resolveFinalPath(pathValue ?? "", name, options);

  const hasValidBranch = Boolean(branchValue) && (branchValue?.length ?? 0) > 0;
  return hasValidBranch
    ? {
        name,
        path: finalPath,
        url: urlValue ?? "",
        branch: branchValue as string,
      }
    : { name, path: finalPath, url: urlValue ?? "" };
}
