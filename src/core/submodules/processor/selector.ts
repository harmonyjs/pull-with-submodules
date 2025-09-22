/**
 * @fileoverview Submodule commit selection logic.
 *
 * Contains the logic for selecting target commits for submodule updates
 * based on remote and local repository state.
 */

import { getCommitSha } from "#lib/git/operations";
import { selectCommitSmart } from "#core/submodules/strategies";
import {
  findSiblingRepository,
  type SiblingRepository,
} from "#core/submodules/siblings";
import type { ExecutionContext, CommitSelection } from "#types/core";
import type { SubmoduleUpdatePlan } from "#core/submodules/types";
import type { Logger } from "#ui/logger";

/**
 * Handles commit selection for submodule updates.
 */
export class SubmoduleCommitSelector {
  private readonly context: ExecutionContext;
  private readonly logger: Logger;

  constructor(context: ExecutionContext, logger: Logger) {
    this.context = context;
    this.logger = logger;
  }

  /**
   * Selects target commit for submodule update.
   *
   * Evaluates both remote and local (sibling) repositories to determine
   * the best commit to use for the submodule update.
   *
   * @param plan - Submodule update plan with branch and URL information
   * @param absolutePath - Absolute path to the submodule directory
   * @returns Promise resolving to selected commit or null if none available
   */
  async selectTargetCommit(
    plan: SubmoduleUpdatePlan,
    absolutePath: string,
  ): Promise<CommitSelection | null> {
    const remoteBranch = `origin/${plan.branch.branch}`;
    const remoteSha = await getCommitSha(remoteBranch, { cwd: absolutePath });

    const sibling = await this.findSiblingIfAvailable(plan, absolutePath);
    const selection = await this.selectCommitWithSibling(
      sibling,
      remoteSha,
      absolutePath,
    );

    this.logSelectionResult(selection, plan.submodule.name);
    return selection;
  }

  /**
   * Finds and validates a sibling repository if available.
   */
  private async findSiblingIfAvailable(
    plan: SubmoduleUpdatePlan,
    absolutePath: string,
  ): Promise<SiblingRepository | null> {
    if (plan.submodule.url === undefined || plan.submodule.url === "") {
      this.logger.verbose(
        `No URL configured for submodule ${plan.submodule.name}, skipping sibling search`,
      );
      return null;
    }

    this.logger.verbose(
      `Searching for local sibling repository for ${plan.submodule.name}`,
    );

    const sibling = await findSiblingRepository({
      submodulePath: absolutePath,
      remoteUrl: plan.submodule.url,
      branch: plan.branch.branch,
      gitConfig: {
        cwd: this.context.repositoryRoot,
        dryRun: this.context.dryRun,
        logger: this.logger,
      },
    });

    this.logSiblingResult(sibling, plan);
    return sibling;
  }

  /**
   * Logs the result of sibling repository discovery.
   */
  private logSiblingResult(
    sibling: SiblingRepository | null,
    plan: SubmoduleUpdatePlan,
  ): void {
    if (
      sibling !== null &&
      sibling.isValid === true &&
      sibling.commitSha !== null
    ) {
      this.logger.verbose(
        `Found local sibling: ${sibling.name} at ${sibling.path} with SHA ${sibling.commitSha}`,
      );
    } else if (sibling !== null && sibling.isValid === true) {
      this.logger.verbose(
        `Found local sibling: ${sibling.name} at ${sibling.path} but no valid SHA for branch ${plan.branch.branch}`,
      );
    } else {
      this.logger.verbose(
        `No valid local sibling found for ${plan.submodule.name}`,
      );
    }
  }

  /**
   * Selects commit using smart commit selection with sibling consideration.
   */
  private async selectCommitWithSibling(
    sibling: SiblingRepository | null,
    remoteSha: string | null,
    absolutePath: string,
  ): Promise<CommitSelection | null> {
    const siblingCommitSha = sibling?.commitSha ?? null;
    return await selectCommitSmart(siblingCommitSha, remoteSha, {
      forceRemote: this.context.forceRemote,
      cwd: absolutePath,
    });
  }

  /**
   * Logs the final commit selection result.
   */
  private logSelectionResult(
    selection: CommitSelection | null,
    submoduleName: string,
  ): void {
    if (selection) {
      this.logger.verbose(
        `Selected commit ${selection.sha} from ${selection.source}: ${selection.reason}`,
      );
    } else {
      this.logger.verbose(`No commit selected for ${submoduleName}`);
    }
  }
}
