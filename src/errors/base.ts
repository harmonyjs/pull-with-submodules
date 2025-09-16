/**
 * @fileoverview Internal base class for typed application errors (relocated to src/errors/).
 */
import type { ErrorCode } from "./types.js";

/**
 * Configuration options for creating application errors.
 * @example
 * ```ts
 * const options: AppErrorOptions = {
 *   code: 'GIT_OPERATION',
 *   cause: new Error('underlying cause'),
 *   suggestions: ['Try resolving conflicts first'],
 *   details: { operation: 'rebase' }
 * };
 * ```
 */
export interface AppErrorOptions extends ErrorOptions {
  /** The error code identifying the type of application error */
  readonly code: ErrorCode;
  /** Optional actionable suggestions for resolving the error */
  readonly suggestions?: readonly string[];
  /** Optional structured metadata about the error context */
  readonly details?: Record<string, unknown>;
}

/**
 * JSON representation of an application error for serialization.
 */
export interface SerializedAppError {
  /** The error class name */
  readonly name: string;
  /** The error message */
  readonly message: string;
  /** The error code identifying the type of application error */
  readonly code: ErrorCode;
  /** Optional actionable suggestions for resolving the error */
  readonly suggestions?: readonly string[];
  /** Optional structured metadata about the error context */
  readonly details?: Record<string, unknown>;
}

/**
 * Base class for all typed application errors.
 *
 * Provides structured error handling with error codes, suggestions for resolution,
 * and contextual details. All error instances are frozen for immutability.
 *
 * @example
 * ```ts
 * class MyError extends BaseAppError {
 *   constructor(message: string, opts: Omit<AppErrorOptions, 'code'>) {
 *     super(message, { ...opts, code: 'MY_ERROR' });
 *     this.name = 'MyError';
 *   }
 * }
 * ```
 */
export class BaseAppError extends Error {
  /** The error code identifying the type of application error */
  public readonly code: ErrorCode;
  /** Optional actionable suggestions for resolving the error */
  public readonly suggestions?: readonly string[];
  /** Optional structured metadata about the error context */
  public readonly details?: Record<string, unknown>;

  /**
   * Creates a new application error.
   *
   * @param message - The error message describing what went wrong
   * @param opts - Configuration options including error code and optional metadata
   */
  constructor(message: string, opts: AppErrorOptions) {
    super(message, { cause: opts.cause });
    this.name = new.target.name;
    this.code = opts.code;
    if (opts.suggestions !== undefined) this.suggestions = opts.suggestions;
    if (opts.details !== undefined) this.details = opts.details;

    // Freeze after all properties are set
    Object.freeze(this);
  }

  /**
   * Serializes the error to a plain object for JSON representation.
   *
   * Only includes optional fields (suggestions, details) when they are defined,
   * producing clean JSON without undefined properties.
   *
   * @returns A serializable representation of the error
   * @example
   * ```ts
   * const error = new MyError('Something failed', { code: 'MY_ERROR' });
   * const json = error.toJSON();
   * // { name: 'MyError', message: 'Something failed', code: 'MY_ERROR' }
   * ```
   */
  toJSON(): SerializedAppError {
    const base = {
      name: this.name,
      message: this.message,
      code: this.code,
    };

    return {
      ...base,
      ...(this.suggestions !== undefined
        ? { suggestions: this.suggestions }
        : {}),
      ...(this.details !== undefined ? { details: this.details } : {}),
    };
  }
}
