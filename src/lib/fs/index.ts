/**
 * @fileoverview Barrel for filesystem utilities module.
 *
 * Provides security-hardened filesystem access with path traversal
 * protection and common file/directory checks.
 */

export { fileExists, isDirectory, resolveAbsolutePath } from "./core.js";
