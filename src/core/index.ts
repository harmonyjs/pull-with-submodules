/**
 * @fileoverview Core layer barrel file.
 *
 * Aggregates and re-exports core domain logic for the pull-with-submodules tool.
 * This layer will contain pure, stateless business logic modules responsible for:
 *  - Git primitives (git.ts)
 *  - Submodule processing (submodules.ts)
 *  - Commit selection strategies (strategies.ts)
 *  - Sibling repository discovery (siblings.ts)
 *  - Gitlink operations (gitlink.ts)
 * Usage:
 *  Import core functionality via this barrel instead of deep paths to keep
 *  dependency boundaries clear and enable future internal refactors.
 */


// Submodule processing module
export {
  createSubmoduleProcessor,
  parseSubmodules,
  prepareUpdatePlans,
  findSiblingRepository,
} from "./submodules/index.js";
export type {
  SubmoduleProcessor,
  SubmoduleUpdatePlan,
  BranchResolution,
  SiblingRepository,
  SiblingDiscoveryOptions,
} from "./submodules/index.js";

// Commit selection strategies module
export { selectCommitSmart } from "./submodules/strategies.js";
export type { CommitSelectionOptions } from "./submodules/strategies.js";

// Ancestry checking utilities
export {
  createGitAncestryChecker,
  createMockAncestryChecker,
} from "./submodules/ancestry-checker.js";
export type { AncestryChecker } from "./submodules/ancestry-checker.js";
