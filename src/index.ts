/**
 * @fileoverview Public entry (barrel) for library consumers.
 *
 * Re-exports primary programmatic interfaces (CLI parsing and context
 * creation) without triggering any side effects or performing argument
 * parsing eagerly. The actual runtime binary will wire these together in a
 * dedicated executable script (see checklist section on binary packaging).
 */
export { parseArgv, buildCli, getCliOptionsFromProcess } from "./cli.js";
export { createContext } from "./context.js";
export type { CliOptions } from "./cli.js";
export type { ExecutionContext } from "./types/core.js";
// Errors public API
export {
  GitOperationError,
  NetworkError,
  isAppError,
  type AppError,
  type ErrorCode,
} from "./errors/index.js";
