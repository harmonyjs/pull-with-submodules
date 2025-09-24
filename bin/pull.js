#!/usr/bin/env node

/**
 * @fileoverview CLI entry point for pull-with-submodules.
 *
 * This is the executable script that users invoke via npm/npx.
 * It parses command-line arguments, handles --help and --version flags,
 * and orchestrates the complete pull-with-submodules workflow.
 */

import { buildCli, parseArgv, createContext, executeComplete, setForceInteractive } from "pull-with-submodules";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cancel } from "@clack/prompts";

/**
 * Sets up graceful shutdown handlers for SIGINT and SIGTERM.
 */
function setupSignalHandlers() {
  let isShuttingDown = false;

  const gracefulShutdown = (signal) => {
    if (isShuttingDown) {
      // Force exit if already shutting down
      process.exit(1);
    }

    isShuttingDown = true;
    cancel(`\nOperation cancelled by user (${signal})`);
    process.exit(130); // Standard exit code for SIGINT
  };

  // Handle Ctrl+C (SIGINT)
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Handle termination (SIGTERM)
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled promise rejection:", reason);
    process.exit(1);
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    process.exit(1);
  });
}

/**
 * Main CLI entry point.
 */
async function main() {
  // Set up signal handlers first
  setupSignalHandlers();

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

    // Set force interactive mode if requested
    if (options.interactive) {
      setForceInteractive(true);
    }

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