/**
 * @fileoverview TUI-specific types for @clack/prompts integration.
 */

/**
 * Interface for @clack/prompts spinner instance.
 */
export interface ClackSpinnerInstance {
  start(message: string): void;
  stop(message: string, code?: number): void;
  message(message: string): void;
}
