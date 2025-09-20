#!/usr/bin/env node

/**
 * @fileoverview CLI entry point for pull-with-submodules.
 *
 * This is the executable script that users invoke via npm/npx.
 * It parses command-line arguments, handles --help and --version flags,
 * and orchestrates the complete pull-with-submodules workflow.
 */

import { buildCli, parseArgv, createContext, executeComplete } from "pull-with-submodules";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * Main CLI entry point.
 */
async function main() {
  try {
    // Check for --help or --version flags first, before any validation
    const argv = process.argv.slice(2);
    if (argv.includes("--help") || argv.includes("-h") || argv.includes("--version") || argv.includes("-v")) {
      const cli = buildCli();

      // Get package.json for version
      const scriptPath = fileURLToPath(import.meta.url);
      const packagePath = join(dirname(dirname(scriptPath)), "package.json");
      const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

      cli.version(packageJson.version);
      cli.help();

      // Parse arguments - this will show help/version and exit
      cli.parse();
      return; // Exit early
    }

    // Parse the actual options for the application
    const options = parseArgv(process.argv.slice(2));

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