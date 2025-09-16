/**
 * @fileoverview Execution context factory for `pull-with-submodules`.
 *
 * Transforms parsed CLI flags plus an externally determined repository root
 * into a strongly typed immutable `ExecutionContext`. This isolates mapping
 * logic so that downstream modules receive a stable shape and tests can
 * easily fabricate contexts without invoking real CLI parsing or filesystem
 * discovery.
 */
import { isAbsolute } from "node:path";
import type { ExecutionContext } from "./types/core.js";
import type { CliOptions } from "./cli.js";

/**
 * Creates an immutable execution context object.
 *
 * Side Effects: none (pure) – validation only.
 *
 * @param options Parsed CLI options.
 * @param repositoryRoot Absolute path to the root repository directory.
 * @throws Error when `repositoryRoot` is not absolute.
 * @returns Immutable `ExecutionContext` instance.
 * @example
 * const ctx = createContext(parseArgv(argv), '/abs/path');
 */
export function createContext(
  options: CliOptions,
  repositoryRoot: string,
): ExecutionContext {
  if (!isAbsolute(repositoryRoot)) {
    throw new Error("repositoryRoot must be an absolute path");
  }
  const ctx: ExecutionContext = Object.freeze({
    dryRun: options.dryRun,
    noCommit: options.noCommit,
    forceRemote: options.forceRemote,
    parallel: options.parallel,
    verbose: options.verbose,
    repositoryRoot,
  });
  return ctx;
}
