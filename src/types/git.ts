/**
 * @fileoverview Git domain type definitions for `pull-with-submodules`.
 *
 * This file encapsulates primitive, serializable TypeScript interfaces and
 * type aliases that describe Git-centric entities used across core logic:
 * commits, branches, submodule configuration records and gitlink update
 * metadata. All constructs here are intentionally minimal (YAGNI) and avoid
 * speculative fields – only what near‑term core modules require:
 *   - `core/git` for low-level operations
 *   - `core/submodules` for parsing & planning
 *   - `core/strategies` for smart commit selection
 *
 * Design Constraints:
 * - Pure data only – no functions embedded in interfaces.
 * - Prefer explicit optional properties over undefined sentinel values.
 * - Keep surface stable and cohesive; each export has one clear responsibility.
 * - All exported names are prefixed with Git* only when ambiguity would arise.
 */

/**
 * Branded commit SHA string to discourage accidental mixing with arbitrary
 * textual values. Implementation uses a type alias (erased at runtime) rather
 * than a wrapper object to preserve ergonomics and performance.
 *
 * Safety: Branding is compile-time only; any string may still be cast – keep
 * construction localized to git result parsing utilities.
 */
export type GitSha = string & { readonly Brand: 'GitSha' };

/**
 * Narrow helper to brand a plain string as a `GitSha`.
 *
 * @param sha - 40 or abbreviated (>=7) hexadecimal commit hash.
 * @returns The same string branded as `GitSha`.
 * @example
 * const head = asGitSha('6ffa2b31');
 */
export function asGitSha(sha: string): GitSha { return sha as GitSha; /* safe: purely nominal branding */ }

/**
 * Minimal representation of a Git commit required by orchestration and
 * decision logic. Additional metadata (author, date, message) is deliberately
 * excluded until a feature requires it (e.g. rich reporting).
 */
export interface GitCommit {
  /** Commit hash identifying the object. */
  readonly sha: GitSha;
}

/**
 * Describes a branch reference within a repository. `remote` is present when
 * the branch is remote-tracking (e.g. origin) – facilitating uniform logging
 * / reasoning without carrying boolean flags. `headSha` MAY be omitted when
 * not yet resolved (lazy fetching scenario).
 */
export interface GitBranch {
  /** Branch name without remote prefix (e.g. `main`, `develop`). */
  readonly name: string;
  /** Optional remote name (e.g. `origin`) when representing remote refs. */
  readonly remote?: string;
  /** HEAD commit hash if already looked up; undefined when deferred. */
  readonly headSha?: GitSha;
}

/**
 * Parsed submodule configuration entry derived from `.gitmodules`. This is a
 * superset of the `Submodule` declared in `core.ts` adding `url`, because the
 * raw configuration may include a repository URL which can inform advanced
 * heuristics (future). For current needs, `url` is optional and may be absent
 * if not specified or intentionally ignored.
 */
export interface SubmoduleConfig {
  /** Section name / logical identifier of the submodule. */
  readonly name: string;
  /** Relative path from repository root to the submodule working tree. */
  readonly path: string;
  /** Optional upstream URL as declared in `.gitmodules`. */
  readonly url?: string;
  /** Optional explicitly configured branch. */
  readonly branch?: string;
}

/**
 * Describes the mutation of a gitlink (the SHA recorded for a submodule in
 * the superproject tree). Used for summarizing and forming commit messages.
 */
export interface GitLinkUpdate {
  /** Submodule relative path (same semantics as `Submodule.path`). */
  readonly path: string;
  /** Previous recorded SHA (undefined if the submodule was newly added). */
  readonly from?: GitSha;
  /** New target SHA after update. */
  readonly to: GitSha;
  /** The branch context used to derive `to` (if applicable). */
  readonly branch?: string;
  /** Human-readable rationale (e.g. "local contains remote"). */
  readonly reason: string;
}

/**
 * Function signature for ancestry checks. Returns true when `ancestor` is an
 * ancestor of `descendant` (merge-base containment). Allows sync usage for
 * deterministic unit tests while production paths will typically be async.
 */
export type AncestorCheckFn = (ancestor: GitSha, descendant: GitSha) => boolean | Promise<boolean>;

/**
 * Lightweight status of whether a working tree (repo or submodule) is clean.
 * Reified as an interface instead of a boolean to allow future extension
 * (e.g. include a diff summary) without breaking consumer call sites.
 */
export interface WorkingTreeState {
  /** True when no staged or unstaged changes are present. */
  readonly clean: boolean;
}
