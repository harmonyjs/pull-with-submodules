#!/usr/bin/env node

/**
 * @fileoverview CLI entry point for pull-with-submodules.
 *
 * This is the executable script that users invoke via npm/npx.
 * It parses command-line arguments, creates the execution context,
 * and orchestrates the complete pull-with-submodules workflow.
 */

import { parseArgv, createContext, executeComplete } from "pull-with-submodules";

/**
 * Main CLI entry point.
 */
async function main() {
  try {
    // Parse command-line arguments
    const options = parseArgv(process.argv);

    // Create execution context
    const context = createContext(options, process.cwd());

    // Execute the complete workflow
    const result = await executeComplete(context);

    // Set exit code based on success
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error("Fatal error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});