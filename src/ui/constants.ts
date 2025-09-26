/**
 * @fileoverview Centralized UI constants and symbols.
 *
 * Contains all UI-related constants, symbols, and magic numbers
 * used throughout the UI layer to ensure consistency and eliminate
 * duplication.
 */

/**
 * UI symbols used across the application.
 */
export const UI_SYMBOLS = {
  // Process indicators
  process: "◆",
  success: "[done]",
  error: "[error]",
  warning: "⚠",
  info: "ℹ",
  verbose: "◇",

  // Status indicators
  upToDate: "[up-to-date]",
  ahead: "↑",
  behind: "↓",
  diverged: "↕",
  modified: "●",
  added: "✚",
  deleted: "✖",
  untracked: "?",

  // UI navigation
  arrow: "→",
  bullet: "•",
  dash: "—",
} as const;

/**
 * UI formatting constants.
 */
export const UI_FORMATTING = {
  // JSON formatting
  JSON_INDENT: 2,

  // Task timing
  MILLISECONDS_PER_SECOND: 1000,

  // File size limits for display
  MAX_FILE_LIST_DISPLAY: 5,
  MAX_PATH_LENGTH: 80,

  // Progress indicators
  SPINNER_FRAMES: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],

  // Color reset
  RESET: "\x1b[0m",
} as const;

/**
 * UI timing constants.
 */
export const UI_TIMING = {
  // Debounce intervals
  LOG_DEBOUNCE_MS: 50,
  UI_UPDATE_DEBOUNCE_MS: 100,

  // Timeouts
  SPINNER_TIMEOUT_MS: 30000, // 30 seconds
  TASK_TIMEOUT_MS: 300000, // 5 minutes

  // Animation durations
  FADE_DURATION_MS: 200,
  SLIDE_DURATION_MS: 300,
} as const;

/**
 * CLI behavior constants.
 */
export const CLI_CONSTANTS = {
  // Exit codes
  SUCCESS_EXIT_CODE: 0,
  ERROR_EXIT_CODE: 1,
  CANCEL_EXIT_CODE: 130,

  // Environment variables
  NO_COLOR_ENV: "NO_COLOR",
  FORCE_COLOR_ENV: "FORCE_COLOR",
  CI_ENV: "CI",

  // TTY detection
  DEFAULT_TTY_COLUMNS: 80,
  MIN_TTY_COLUMNS: 40,
} as const;

/**
 * Type for UI symbol keys to ensure type safety.
 */
export type UISymbolKey = keyof typeof UI_SYMBOLS;

/**
 * Type for formatting constants to ensure type safety.
 */
export type UIFormattingKey = keyof typeof UI_FORMATTING;
