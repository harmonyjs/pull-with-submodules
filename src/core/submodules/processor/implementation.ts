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
import type { ExecutionContext, Submodule, UpdateResult } from "#types/core";
import { createLogger, type Logger } from "#ui/logger";
import { SubmoduleUpdateExecutor } from "./executor.js";
import { SubmoduleCommitSelector } from "./selector.js";
import {
  type BranchResolution,
  type SubmoduleUpdatePlan,
  type SubmoduleProcessor,
} from "#core/submodules/types";
import {
  performSubmoduleSync,
  performSubmoduleInit,
} from "#core/submodules/operations";
import { resolveBranch } from "#core/submodules/branch-resolver";
import {
  prepareUpdatePlan,
  enrichPlanWithCurrentSha,
} from "#core/submodules/update-planner";
import {
  normalizeSubmoduleEntry,
  createCurrentShaGetter,
  getErrorMessage,
} from "#core/submodules/helpers";
import {
  validateAndLogPaths,
  logPlanDetails,
  createPathCache,
} from "./helpers.js";

/**
 * Implementation of SubmoduleProcessor.
 */
export class SubmoduleProcessorImpl implements SubmoduleProcessor {
  private readonly logger: Logger;
  private readonly context: ExecutionContext;
  private readonly pathCache = createPathCache();
  private readonly executor: SubmoduleUpdateExecutor;
  private readonly selector: SubmoduleCommitSelector;

  constructor(context: ExecutionContext) {
    this.logger = createLogger(context);
    this.context = context;
    this.executor = new SubmoduleUpdateExecutor(
      context,
      this.logger,
      (submodule, ctx) => this.pathCache.get(submodule, ctx),
    );
    this.selector = new SubmoduleCommitSelector(context, this.logger);
  }

  async parseSubmodules(repoPath: string): Promise<Submodule[]> {
    this.logger.verbose(`Parsing .gitmodules in ${repoPath}`);

    const gitmodulesPath = join(repoPath, ".gitmodules");
    const exists = await fileExists(gitmodulesPath);

    if (!exists) {
      this.logger.verbose("No .gitmodules file found, returning empty array");
      return [];
    }

    try {
      const entries = await readGitmodules(gitmodulesPath, {
        resolveAbsolute: false,
        baseDir: repoPath,
      });

      this.logger.verbose(
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
    return this.executor.executeUpdatePlan(plan, (p, absolutePath) =>
      this.selector.selectTargetCommit(p, absolutePath),
    );
  }
}
