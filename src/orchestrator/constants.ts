/**
 * @fileoverview Constants for orchestrator operations.
 *
 * Defines numeric constants to avoid magic numbers and provide
 * meaningful names for configuration values.
 */

// Rationale: Limit of 4 based on Git's default concurrent operations and
// typical I/O constraints; prevents overwhelming the system while maintaining speed
export const MAX_PARALLEL_SUBMODULES = 4;

export const MILLISECONDS_PER_SECOND = 1000;