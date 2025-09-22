/**
 * @fileoverview Clack logging adapter.
 *
 * Provides logging functionality using @clack/prompts log methods.
 * Separated from UI operations for better separation of concerns
 * and easier testing.
 */

import { log } from "@clack/prompts";
import type { LogImplementation } from "./types.js";

/**
 * Clack logging adapter that implements LogImplementation.
 *
 * Provides consistent logging interface using @clack/prompts log
 * functionality with proper styling and formatting.
 */
export class ClackLogAdapter implements LogImplementation {
  /**
   * Logs a step message (debug level).
   *
   * @param message Message to log
   */
  // eslint-disable-next-line class-methods-use-this -- Intentional delegation to static method for consistent API
  step = (message: string): void => {
    ClackLogAdapter.step(message);
  };

  /**
   * Logs an informational message.
   *
   * @param message Message to log
   */
  // eslint-disable-next-line class-methods-use-this -- Intentional delegation to static method for consistent API
  info = (message: string): void => {
    ClackLogAdapter.info(message);
  };

  /**
   * Logs a warning message.
   *
   * @param message Message to log
   */
  // eslint-disable-next-line class-methods-use-this -- Intentional delegation to static method for consistent API
  warn = (message: string): void => {
    ClackLogAdapter.warn(message);
  };

  /**
   * Logs an error message.
   *
   * @param message Message to log
   */
  // eslint-disable-next-line class-methods-use-this -- Intentional delegation to static method for consistent API
  error = (message: string): void => {
    ClackLogAdapter.error(message);
  };

  /**
   * Logs a message with custom symbol.
   *
   * @param message Message to log
   * @param symbol Custom symbol to display
   */
  // eslint-disable-next-line class-methods-use-this -- Intentional delegation to static method for consistent API
  message = (message: string, symbol: string): void => {
    ClackLogAdapter.message(message, symbol);
  };

  // Static methods that do the actual work
  static step(message: string): void {
    log.step(message);
  }

  static info(message: string): void {
    log.info(message);
  }

  static warn(message: string): void {
    log.warn(message);
  }

  static error(message: string): void {
    log.error(message);
  }

  static message(message: string, symbol: string): void {
    log.message(message, { symbol });
  }
}

/**
 * Default Clack log adapter instance for use throughout the application.
 */
export const clackLogAdapter = new ClackLogAdapter();
