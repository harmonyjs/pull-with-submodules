# Implementation Checklist: pull-with-submodules

Comprehensive step-by-step checklist derived from `IMPLEMENTATION_PROPOSAL.md`. Use this as the authoritative progress tracker. Each item should be checked off (✓) when completed. Keep sections in order.

Legend: 
- [ ] = Pending
- [x] = Done
- (opt) = Optional / Nice-to-have in v0.1.0

---

## 1. Project Initialization
- [x] Initialize git repository & branch strategy (main)
- [x] Add MIT `LICENSE`
- [x] Create `README.md` (initial scaffold)
- [x] Configure `package.json` (name, version, bin, type=module, scripts)
- [x] Add dependencies: `simple-git`, `cac`, `@clack/prompts`, `p-limit`
- [x] Add devDependencies: `typescript`, `tsx`, `eslint`, `@types/node`
- [x] Add `tsconfig.json` with strict settings
- [x] Add `eslint.config.mjs` baseline
- [x] Add `.gitignore`
 - [x] Add `.npmignore` (covered by package.json "files" whitelist; explicit file not needed)

## 2. Directory Structure
- [x] Create `src/` root
- [x] Create `src/types/`
- [x] Create `src/core/`
- [ ] Create `src/lib/`
- [ ] Create `src/ui/`
- [x] Add placeholder `src/index.ts`
- [ ] Create `bin/` entry script linking to dist (after build) (post-build)

## 3. Type Definitions
- [x] Implement `src/types/core.ts`
- [x] Implement `src/types/git.ts` (basic Git-related types if needed)
- [ ] Export all domain types from barrel (opt)

## 4. Context & CLI
- [ ] Implement `src/cli.ts` with `cac`
  - [ ] Define flags: `--dry-run`, `--no-commit`, `--force-remote`, `--parallel`, `--verbose`
  - [ ] Provide `--help` & `--version`
  - [ ] Validate mutually exclusive / constraints if any
- [ ] Implement `src/context.ts` factory
- [ ] Add tests: `cli.spec.ts`, `context.spec.ts`

## 5. UI Layer
- [ ] Implement `src/ui/logger.ts` (thin wrapper or adapter if needed)
- [ ] Implement `src/ui/prompts.ts` using `@clack/prompts`
  - [ ] Intro/outro helpers
  - [ ] Cancellation handling
- [ ] Implement `src/ui/formatters.ts` (summary tables, durations)
- [ ] Add tests for UI pure functions (`logger.spec.ts`, `formatters.spec.ts`)
- [ ] (opt) Light snapshot style tests for prompt wrappers (mocked)

## 6. Lib Utilities
- [ ] Implement `src/lib/errors.ts` (`GitOperationError`, `NetworkError`, etc.)
- [ ] Implement `src/lib/async.ts` (retry, parallel runner with `p-limit`)
- [ ] Implement `src/lib/fs.ts` (fs helpers: read .gitmodules, path resolution)
- [ ] Implement `src/lib/git-utils.ts` (ancestor checks via raw git)
- [ ] Tests: `errors.spec.ts`, `async.spec.ts`, `fs.spec.ts`, `git-utils.spec.ts`

## 7. Core Logic
### 7.1 Git Operations
- [ ] Implement `core/git.ts`
  - [ ] `createGit(baseDir)` factory
  - [ ] `pullWithRebase(repoPath)` with conflict handling
  - [ ] Expose minimal primitives (fetch, status wrappers if needed)
  - [ ] Tests: success, rebase conflict scenario

### 7.2 Submodules
- [ ] Implement `core/submodules.ts`
  - [ ] Parse `.gitmodules`
  - [ ] Determine branch resolution order
  - [ ] Sync & update initialization
  - [ ] Prepare update plan objects
  - [ ] Tests: parsing & branch resolution logic

### 7.3 Strategies
- [ ] Implement `core/strategies.ts`
  - [ ] `selectCommitSmart(localSha, remoteSha, forceRemote)`
  - [ ] Accept injected `isAncestor` function (for testability) (opt)
  - [ ] Tests covering all decision branches

### 7.4 Siblings Discovery
- [ ] Implement `core/siblings.ts`
  - [ ] Search `../<name>` pattern
  - [ ] Validate is a git repo
  - [ ] Resolve commit SHA for candidate branch
  - [ ] Tests for discovery logic

### 7.5 Gitlink Operations
- [ ] Implement `core/gitlink.ts`
  - [ ] Add/Stage submodule path
  - [ ] Commit message format: `chore(submodule): bump <path> to <branch> @ <sha>`
  - [ ] Respect `dryRun` and `noCommit`
  - [ ] Tests: commit invoked / skipped

## 8. Orchestration (`index.ts`)
- [ ] Implement environment validation (git exists, node version >= requirement)
- [ ] Detect repository root
- [ ] Evaluate working tree cleanliness
- [ ] Stash logic (push/pop) when needed & not dry-run
- [ ] Pull main repository with rebase
- [ ] Load and process submodules
  - [ ] Sequential and parallel modes
  - [ ] Collect per-submodule results (timings, status)
- [ ] Apply gitlink commits if changes
- [ ] Render summary report
- [ ] Restore stash (if created)
- [ ] Structured error handling & exit codes
- [ ] Tests (unit-level for orchestrator pure helpers; integration deferred)

## 9. Error Handling & Resilience
- [ ] Centralize error classes usage
- [ ] Implement retry for network-like fetch operations (if simulated)
- [ ] Ensure rebase conflicts abort properly and surface actionable message
- [ ] Ensure partial submodule failures do not abort full run
- [ ] Provide aggregated error summary

## 10. Performance Considerations
- [ ] Constrain concurrency to 4 (p-limit)
- [ ] Ensure no unbounded promise arrays retained
- [ ] Measure basic timing (Date.now wrappers)
- [ ] (opt) Lazy load heavy modules if any

## 11. Logging & Verbosity
- [ ] Verbose flag gates detailed git commands
- [ ] Dry-run clearly prefixes actions (e.g., `DRY-RUN:`)
- [ ] Consistent emoji / symbol usage (opt)

## 12. Testing Strategy Implementation
- [ ] Configure test script: `"test": "tsx --test \"src/**/*.spec.ts\""`
- [ ] Add coverage tool (opt in v0.1.0) (nyc or c8) (opt)
- [ ] Write unit tests for all pure modules
- [ ] Mock simple-git in core tests
- [ ] Provide fixtures for `.gitmodules` parsing
- [ ] Edge cases: no submodules, empty file, invalid path, divergent histories

## 13. Quality Gates
- [ ] ESLint passes (no warnings)
- [ ] TypeScript strict build clean
- [ ] File length ≤ 200 lines audit
- [ ] Function length ≤ 50 lines audit
- [ ] Cyclomatic complexity spot-check (manual / eslint plugin) (opt)

## 14. Documentation
- [ ] Update `README.md` with final usage examples
- [ ] Add section explaining smart selection algorithm
- [ ] Add examples for parallel vs sequential
- [ ] Add dry-run output example
- [ ] Add contributing guide (opt)
- [ ] Add CHANGELOG.md (Keep a Changelog format) (opt for 0.1.0)

## 15. Binary Packaging
- [ ] Add `bin/pull-with-submodules` with shebang
- [ ] Ensure `package.json` `bin` field maps correctly
- [ ] Build step outputs to `dist/`
- [ ] Validate ESM compatibility
- [ ] Run `npm pack` sanity check

## 16. Release Preparation
- [ ] Final manual run on real repo with submodules
- [ ] Verify dry-run correctness
- [ ] Verify force-remote logic
- [ ] Verify no-commit leaves gitlinks unstaged or staged? (decide behavior)
- [ ] Tag version `v0.1.0`
- [ ] Publish to npm

## 17. Post-Release (Future Enhancements)
- [ ] Integration tests with temporary git fixtures
- [ ] Windows CI matrix
- [ ] Add --since flag to limit submodule processing (concept)
- [ ] Configurable concurrency flag value
- [ ] Telemetry opt-in (usage stats) (defer)

## 18. Security Checklist
- [ ] Sanitize all dynamic parts of raw git commands
- [ ] No secrets/logging of environment variables
- [ ] Dependency audit (`npm audit --production`)
- [ ] Pin minimal major versions

## 19. Maintenance
- [ ] Set up CI workflow (lint + test)
- [ ] Add coverage reporting (Coveralls) (opt)
- [ ] Renovate / Dependabot config (opt)

---

## Quick Progress Snapshot (update manually)
- Core Modules: [ ]
- Tests: [ ]
- Docs: [ ]
- Release Ready: [ ]

---

Keep this checklist updated in PRs. Remove or annotate tasks if scope changes.
