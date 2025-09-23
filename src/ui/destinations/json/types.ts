/**
 * @fileoverview JSON destination types and interfaces.
 */

import type { LogLevel } from "#ui/types";

/**
 * JSON log entry structure.
 */
export interface JSONLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  type:
    | "log"
    | "spinner_start"
    | "spinner_end"
    | "task_start"
    | "task_end"
    | "note";
  status?: "success" | "error";
  title?: string;
}
