/**
 * @fileoverview Public errors module barrel. Provides minimal surface.
 */
export { GitOperationError } from "./git-operation.js";
export { NetworkError } from "./network.js";
export { isAppError, type AppError, type ErrorCode } from "./guards.js";
