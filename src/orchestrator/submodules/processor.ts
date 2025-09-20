/**
 * @fileoverview Individual submodule processing with error handling.
 *
 * Contains logic for processing individual submodules with proper error
 * handling and result creation.
 */

import { createSubmoduleProcessor } from "#core";
import type { ExecutionContext, UpdateResult, Submodule } from "#types/core";

/**
 * Processes a single submodule with comprehensive error handling.
 *
 * @param submodule - Submodule to process
 * @param context - Execution context
 * @returns Promise resolving to processing result
 */
export async function processSubmoduleWithErrorHandling(
  submodule: Submodule,
  context: ExecutionContext,
): Promise<UpdateResult> {
  const startTime = Date.now();

  try {
    const processor = createSubmoduleProcessor(context);
    const plan = await processor.prepareUpdatePlan(submodule);

    // Execute the update plan
    return await processor.executeUpdatePlan(plan);
  } catch (error) {
    return {
      submodule,
      selection: null,
      status: "failed",
      duration: Date.now() - startTime,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
