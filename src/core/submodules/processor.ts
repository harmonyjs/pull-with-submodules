/**
 * @fileoverview Implementation of SubmoduleProcessor interface.
 *
 * Provides the default production implementation of submodule processing
 * operations including parsing, branch resolution, and update planning.
 */

import { join } from "node:path";
import { readGitmodules } from "#lib/git/gitmodules";
import { fileExists } from "#lib/fs/core";
import { GitOperationError } from "#errors/index";
import type {
  ExecutionContext,
  Submodule,
  UpdateResult,
  CommitSelection,
} from "#types/core";
import { createLogger, type Logger } from "#ui/logger";
import { getCommitSha, fetchRemotes } from "#lib/git/operations";
import { selectCommitSmart } from "./strategies.js";
import { findSiblingRepository } from "./siblings.js";
import {
  createSkippedResult,
  createUpdatedResult,
  createFailedResult,
} from "./result-utils.js";
import {
  type BranchResolution,
  type SubmoduleUpdatePlan,
  type SubmoduleProcessor,
} from "./types.js";
import {
  performSubmoduleSync,
  performSubmoduleInit,
  performSubmoduleUpdate,
  type SubmoduleUpdateParams,
} from "./operations.js";
import { resolveBranch } from "./branch-resolver.js";
import {
  prepareUpdatePlan,
  enrichPlanWithCurrentSha,
} from "./update-planner.js";
import {
  normalizeSubmoduleEntry,
  createCurrentShaGetter,
  getErrorMessage,
} from "./helpers.js";
import {
  validateAndLogPaths,
  logPlanDetails,
  createPathCache,
} from "./processor-helpers.js";

/**
 * Implementation of SubmoduleProcessor.
 */
export class SubmoduleProcessorImpl implements SubmoduleProcessor {
  private readonly logger: Logger;
  private readonly context: ExecutionContext;
  private readonly pathCache = createPathCache();

  constructor(context: ExecutionContext) {
    this.logger = createLogger(context);
    this.context = context;
  }

  async parseSubmodules(repoPath: string): Promise<Submodule[]> {
    this.logger.debug(`Parsing .gitmodules in ${repoPath}`);

    const gitmodulesPath = join(repoPath, ".gitmodules");
    const exists = await fileExists(gitmodulesPath);

    if (!exists) {
      this.logger.debug("No .gitmodules file found, returning empty array");
      return [];
    }

    try {
      const entries = await readGitmodules(gitmodulesPath, {
        resolveAbsolute: false,
        baseDir: repoPath,
      });

      this.logger.debug(
        `Parsed ${entries.length} submodule(s) from .gitmodules`,
      );

      return entries.map((entry) => normalizeSubmoduleEntry(entry));
    } catch (error) {
      throw new GitOperationError(
        `Failed to parse .gitmodules file at ${gitmodulesPath}`,
        {
          cause: error,
          details: { gitmodulesPath, repoPath, error: getErrorMessage(error) },
          suggestions: [
            "Check .gitmodules syntax is valid",
            "Ensure all required fields (path, url) are present",
            "Verify file permissions allow reading",
          ],
        },
      );
    }
  }

  async resolveBranch(submodule: Submodule): Promise<BranchResolution> {
    return resolveBranch(submodule, this.context, this.logger);
  }

  async syncSubmodule(submodulePath: string): Promise<void> {
    return performSubmoduleSync(submodulePath, this.context, this.logger);
  }

  async initializeSubmodule(submodulePath: string): Promise<void> {
    return performSubmoduleInit(submodulePath, this.context, this.logger);
  }

  async prepareUpdatePlan(submodule: Submodule): Promise<SubmoduleUpdatePlan> {
    validateAndLogPaths(submodule, this.logger);

    const { absolutePath } = this.pathCache.get(submodule, this.context);

    const basePlan = await prepareUpdatePlan({
      submodule,
      context: this.context,
      logger: this.logger,
      resolveBranch: (sub) => this.resolveBranch(sub),
    });

    const getCurrentSha = createCurrentShaGetter(absolutePath, (error) => {
      this.logger.warn(
        `Failed to get current SHA for ${submodule.name}: ${getErrorMessage(error)}`,
      );
    });
    const finalPlan = await enrichPlanWithCurrentSha(basePlan, getCurrentSha);

    logPlanDetails(finalPlan, this.logger);

    return finalPlan;
  }

  async executeUpdatePlan(plan: SubmoduleUpdatePlan): Promise<UpdateResult> {
    const startTime = Date.now();

    try {
      const { absolutePath } = this.pathCache.get(plan.submodule, this.context);

      await this.prepareSubmodule(plan, absolutePath);
      const selection = await this.selectTargetCommit(plan, absolutePath);

      if (!selection) {
        return createSkippedResult(plan.submodule, startTime);
      }

      if (this.isUpdateNeeded(plan, selection)) {
        await this.applySubmoduleUpdate(plan, selection, absolutePath);
        return createUpdatedResult(plan.submodule, selection, startTime);
      } else {
        return createSkippedResult(plan.submodule, startTime, selection);
      }
    } catch (error) {
      return createFailedResult(plan.submodule, startTime, error);
    }
  }

  private async prepareSubmodule(
    plan: SubmoduleUpdatePlan,
    absolutePath: string,
  ): Promise<void> {
    if (plan.needsInit) {
      await this.initializeSubmodule(absolutePath);
    }
    await this.syncSubmodule(absolutePath);
    await fetchRemotes({
      cwd: absolutePath,
      dryRun: this.context.dryRun,
      logger: this.logger,
    });
  }

  private async selectTargetCommit(
    plan: SubmoduleUpdatePlan,
    absolutePath: string,
  ): Promise<CommitSelection | null> {
    const remoteBranch = `origin/${plan.branch.branch}`;
    const remoteSha = await getCommitSha(remoteBranch, { cwd: absolutePath });

    let sibling = null;
    if (plan.submodule.url !== undefined && plan.submodule.url !== "") {
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
    }

    return selectCommitSmart(sibling?.commitSha || null, remoteSha, {
      forceRemote: this.context.forceRemote,
      cwd: absolutePath,
    });
  }

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
