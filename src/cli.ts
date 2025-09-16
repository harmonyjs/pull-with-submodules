/**
 * @fileoverview CLI argument parsing for `pull-with-submodules`.
 *
 * Provides a pure `parseArgv` function (side‑effect free) for unit tests and
 * higher-level orchestration, plus a small helper to build a fully fledged
 * `cac` instance with help/version wiring for the eventual bin entry. The
 * design deliberately avoids executing parsing logic on import to keep the
 * module tree free of implicit global state and ease test isolation.
 */
import { cac, type CAC } from "cac";

/**
 * Parsed CLI option set consumed by the context factory. All flags are
 * boolean toggles with sensible false defaults (zero‑config philosophy).
 */
export interface CliOptions {
  /** Preview operations without mutating repositories. */
  readonly dryRun: boolean;
  /** Skip auto‑commit of gitlink (submodule pointer) changes. */
  readonly noCommit: boolean;
  /** Force remote preference over local sibling repositories. */
  readonly forceRemote: boolean;
  /** Process submodules in parallel (bounded concurrency). */
  readonly parallel: boolean;
  /** Emit verbose diagnostic output for debugging. */
  readonly verbose: boolean;
}

/** Internal mutable parsing shape prior to freezing into `CliOptions`. */
type MutableCliOptions = CliOptions; // Pure alias for clarity (avoids empty interface rule)

/** Default flag values (kept single source of truth). */
const defaultOptions: CliOptions = Object.freeze({
  dryRun: false,
  noCommit: false,
  forceRemote: false,
  parallel: false,
  verbose: false,
});

/**
 * Builds a configured `cac` instance. Separated to allow reuse by a future
 * bin script while tests can directly call `parseArgv` without incurring
 * formatting or process.exit side effects.
 *
 * @param programName Executable / display name for help output.
 */
export function buildCli(programName = "pull-with-submodules"): CAC {
  const cli = cac(programName);
  cli
    .option("-d, --dry-run", "Preview changes without applying them")
    .option("-n, --no-commit", "Skip auto-commit of gitlink updates")
    .option("-r, --force-remote", "Always prefer remote over local siblings")
    .option("-p, --parallel", "Process submodules in parallel (max 4)")
    .option("-v, --verbose", "Show detailed debug output");
  return cli;
}

/**
 * Parses an argv vector (excluding the node/bin preface) into a normalized,
 * immutable `CliOptions` object. Unknown flags are ignored (current
 * minimalistic policy). Future validation (e.g. mutually exclusive flags)
 * can be layered here without changing the call sites.
 *
 * @param argv Argument vector (typically `process.argv.slice(2)`).
 * @returns Normalized immutable options object.
 * @example
 * const opts = parseArgv(['--dry-run', '-v']);
 */
export function parseArgv(argv: readonly string[]): CliOptions {
  const cli = buildCli();
  // Use spread to avoid mutation of input `argv` if caller provided a frozen array.
  // `cac` expects a full `process.argv`-like vector (node + script + args)
  // when a custom argv array is supplied. We prepend synthetic placeholders
  // so that user-provided flags are preserved intact.
  const SYNTHETIC_ARGV_PREFIX = ["node", "cli"] as const; // stable synthetic argv head
  const parsed = cli.parse([...SYNTHETIC_ARGV_PREFIX, ...argv]);
  const flags = parsed.options as Record<string, unknown>;

  // Access via bracket notation due to index signature typing returned by `cac`.
  // Manual detection for the negated flag form to avoid library nuances with '--no-xxx'.
  const raw = new Set(argv);
  const result: MutableCliOptions = {
    dryRun: Boolean(flags["dryRun"]),
    noCommit: raw.has("--no-commit") || raw.has("-n"),
    forceRemote: Boolean(flags["forceRemote"]),
    parallel: Boolean(flags["parallel"]),
    verbose: Boolean(flags["verbose"]),
  };
  return Object.freeze({ ...defaultOptions, ...result });
}

/**
 * Convenience helper for production entry points to obtain CLI options from
 * the running process. Kept thin so that orchestration can remain easily
 * testable by calling `parseArgv` directly.
 */
export function getCliOptionsFromProcess(): CliOptions {
  const PROCESS_ARGV_USER_INDEX = 2; // index where user args begin in process.argv
  return parseArgv(process.argv.slice(PROCESS_ARGV_USER_INDEX));
}

// No default export – explicit named exports preferred for tree clarity.
