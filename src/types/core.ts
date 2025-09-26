/**
 * @fileoverview Core domain type definitions for `pull-with-submodules`.
 */

/**
 * Describes the resolved execution context derived from CLI flags and
 * environment inspection. Passed top‑down to orchestration and (where
 * beneficial) to factories. Keep this minimal to avoid becoming a
 * de facto global state bag.
 */
export interface ExecutionContext {
  /** True when running in dry-run mode (no mutating git operations). */
  readonly dryRun: boolean;
  /** Skip auto-commit of gitlink (submodule pointer) changes. */
  readonly noCommit: boolean;
  /** Force remote commit preference over local sibling repositories. */
  readonly forceRemote: boolean;
  /** Process submodules concurrently (bounded by concurrency limit). */
  readonly parallel: boolean;
  /** Emit verbose diagnostic output (debug-level git command traces). */
  readonly verbose: boolean;
  /** Absolute path to the root repository (containing the .git directory). */
  readonly repositoryRoot: string;
}

/**
 * A Git submodule entry as defined in `.gitmodules` (already parsed and
 * normalized). Fields intentionally exclude transient state – operational
 * data belongs in `UpdateResult`.
 */
export interface Submodule {
  /** Logical name (key) of the submodule – usually the section name. */
  readonly name: string;
  /** Filesystem path to the submodule relative to the repository root. */
  readonly path: string;
  /** Remote URL of the submodule repository (if available). */
  readonly url?: string;
  /** Optional explicit tracking branch if present in configuration. */
  readonly branch?: string;
}

/** Source classification for a selected commit. */
export type CommitSource = "local" | "remote";

/**
 * Represents the decision made by the smart selection strategy regarding
 * which commit a submodule should advance to (and why). A `null` selection
 * in `UpdateResult` indicates no change is necessary.
 */
export interface CommitSelection {
  /** Target commit SHA (full or abbreviated) to align the submodule to. */
  readonly sha: string;
  /** Origin of the chosen commit: local sibling repository or remote origin. */
  readonly source: CommitSource;
  /** Human-readable rationale (used in verbose logs & summary tables). */
  readonly reason: string;
  /**
   * Optional absolute path to local sibling repository when source is 'local'.
   * Used to fetch unpushed commits from local development repositories.
   * Only set when the selected commit comes from a local sibling that has
   * unpushed changes not available in the submodule's remote.
   */
  readonly localPath?: string;
}

/** Processing outcome classification for a submodule. */
export type SubmoduleProcessStatus =
  | "updated"
  | "up-to-date"
  | "skipped"
  | "failed";

/**
 * Result of attempting to process (evaluate & update) a single submodule.
 * Serves as an immutable record consumed by summary formatting and logging.
 */
export interface UpdateResult {
  /** The submodule descriptor this result pertains to. */
  readonly submodule: Submodule;
  /** Selected commit decision (null if unchanged / skipped prior to selection). */
  readonly selection: CommitSelection | null;
  /** High-level categorized status used for summary aggregation. */
  readonly status: SubmoduleProcessStatus;
  /** Elapsed wall-clock duration in milliseconds for the processing step. */
  readonly duration: number;
  /** Optional captured error object when status === 'failed'. */
  readonly error?: Error;
}

/**
 * Aggregated run summary (future extension point). Not exported yet to avoid
 * premature commitment; introduce once orchestration layer materializes a
 * stable shape for global reporting.
 *
 * (Intentionally omitted by now.)
 */
// export interface RunSummary { /* add when needed */ }
