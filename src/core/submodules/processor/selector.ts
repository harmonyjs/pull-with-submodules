/**
 * @fileoverview Submodule commit selection logic.
 *
 * Contains the logic for selecting target commits for submodule updates
 * based on remote and local repository state.
 */

import { getCommitSha } from "#lib/git/operations";
import { selectCommitSmart } from "#core/submodules/strategies";
import { findSiblingRepository } from "#core/submodules/siblings";
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

    let sibling = null;
    if (plan.submodule.url !== undefined && plan.submodule.url !== "") {
      this.logger.verbose(`Searching for local sibling repository for ${plan.submodule.name}`);
      sibling = await findSiblingRepository({
        submodulePath: absolutePath,
        remoteUrl: plan.submodule.url,
        branch: plan.branch.branch,
        gitConfig: {
          cwd: this.context.repositoryRoot,
          dryRun: this.context.dryRun,
          logger: this.logger,
        },
        logger: this.logger,
      });

      if (sibling !== null && sibling.isValid === true && sibling.commitSha !== null) {
        this.logger.verbose(`Found local sibling: ${sibling.name} at ${sibling.path} with SHA ${sibling.commitSha}`);
      } else if (sibling !== null && sibling.isValid === true) {
        this.logger.verbose(`Found local sibling: ${sibling.name} at ${sibling.path} but no valid SHA for branch ${plan.branch.branch}`);
      } else {
        this.logger.verbose(`No valid local sibling found for ${plan.submodule.name}`);
      }
    } else {
      this.logger.verbose(`No URL configured for submodule ${plan.submodule.name}, skipping sibling search`);
    }

    const selection = await selectCommitSmart(sibling?.commitSha || null, remoteSha, {
      forceRemote: this.context.forceRemote,
      cwd: absolutePath,
    });

    if (selection) {
      this.logger.verbose(`Selected commit ${selection.sha} from ${selection.source}: ${selection.reason}`);
    } else {
      this.logger.verbose(`No commit selected for ${plan.submodule.name}`);
    }

    return selection;
  }
}
