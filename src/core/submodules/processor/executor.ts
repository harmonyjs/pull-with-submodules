/**
 * @fileoverview Submodule update execution logic.
 *
 * Contains the logic for executing submodule update plans including
 * preparation, validation, and actual update operations.
 */

import { fetchRemotes } from "#lib/git/operations";
import {
  createSkippedResult,
  createUpdatedResult,
  createUpToDateResult,
  createFailedResult,
} from "#core/submodules/result-utils";
import {
  performSubmoduleSync,
  performSubmoduleInit,
  performSubmoduleUpdate,
  type SubmoduleUpdateParams,
} from "#core/submodules/operations";
import type {
  ExecutionContext,
  UpdateResult,
  CommitSelection,
  Submodule,
} from "#types/core";
import type { SubmoduleUpdatePlan } from "#core/submodules/types";
import type { Logger } from "#ui/logger";

/**
 * Handles execution of submodule update plans.
 */
export class SubmoduleUpdateExecutor {
  private readonly context: ExecutionContext;
  private readonly logger: Logger;
  private readonly getPathInfo: (
    submodule: Submodule,
    context: ExecutionContext,
  ) => { absolutePath: string };

  constructor(
    context: ExecutionContext,
    logger: Logger,
    getPathInfo: (
      submodule: Submodule,
      context: ExecutionContext,
    ) => { absolutePath: string },
  ) {
    this.context = context;
    this.logger = logger;
    this.getPathInfo = getPathInfo;
  }

  /**
   * Executes a submodule update plan and returns the result.
   *
   * @param plan - Complete update plan with submodule and branch information
   * @param selectTargetCommit - Function to select target commit for update
   * @returns Promise resolving to update result
   */
  async executeUpdatePlan(
    plan: SubmoduleUpdatePlan,
    selectTargetCommit: (
      plan: SubmoduleUpdatePlan,
      absolutePath: string,
    ) => Promise<CommitSelection | null>,
  ): Promise<UpdateResult> {
    const startTime = Date.now();

    try {
      const { absolutePath } = this.getPathInfo(plan.submodule, this.context);

      await this.prepareSubmodule(plan, absolutePath);
      const selection = await selectTargetCommit(plan, absolutePath);

      if (!selection) {
        return createSkippedResult({
          submodule: plan.submodule,
          startTime,
          selection: null,
          context: this.context,
        });
      }

      if (this.isUpdateNeeded(plan, selection)) {
        await this.applySubmoduleUpdate(plan, selection, absolutePath);
        return createUpdatedResult({
          submodule: plan.submodule,
          selection,
          startTime,
          context: this.context,
        });
      } else {
        return createUpToDateResult({
          submodule: plan.submodule,
          selection,
          startTime,
          context: this.context,
        });
      }
    } catch (error) {
      return createFailedResult({
        submodule: plan.submodule,
        startTime,
        error,
        context: this.context,
      });
    }
  }

  /**
   * Prepares submodule for update by syncing and fetching remotes.
   */
  private async prepareSubmodule(
    plan: SubmoduleUpdatePlan,
    absolutePath: string,
  ): Promise<void> {
    if (plan.needsInit) {
      await performSubmoduleInit(absolutePath, this.context, this.logger);
    }
    await performSubmoduleSync(absolutePath, this.context, this.logger);
    await fetchRemotes({
      cwd: absolutePath,
      dryRun: this.context.dryRun,
      logger: this.logger,
    });
  }

  /**
   * Checks if submodule update is needed based on current and target SHA.
   */
  private isUpdateNeeded(
    plan: SubmoduleUpdatePlan,
    selection: CommitSelection,
  ): boolean {
    if (!plan.currentSha || plan.currentSha !== selection.sha) {
      return true;
    }
    this.logger.debug(
      `Submodule ${plan.submodule.name} already at target SHA ${selection.sha}`,
    );
    return false;
  }

  /**
   * Applies submodule update using the selected commit.
   */
  private async applySubmoduleUpdate(
    plan: SubmoduleUpdatePlan,
    selection: CommitSelection,
    absolutePath: string,
  ): Promise<void> {
    const updateParams: SubmoduleUpdateParams = {
      submodulePath: absolutePath,
      targetSha: selection.sha,
      branchName: plan.branch.branch,
      context: this.context,
      logger: this.logger,
    };
    await performSubmoduleUpdate(updateParams);
  }
}
