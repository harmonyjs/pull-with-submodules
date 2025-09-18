/**
 * @fileoverview Implementation of SubmoduleProcessor interface.
 *
 * Provides the default production implementation of submodule processing
 * operations including parsing, branch resolution, and update planning.
 */

import { join } from "node:path";
import { readGitmodules } from "#lib/git/gitmodules.js";
import { fileExists } from "#lib/fs/core.js";
import { GitOperationError } from "#errors/index.js";
import type { ExecutionContext, Submodule } from "#types/core.js";
import { createLogger, type Logger } from "#ui/logger.js";
import {
  type BranchResolution,
  type SubmoduleUpdatePlan,
  type SubmoduleProcessor,
} from "./types.js";
import { performSubmoduleSync, performSubmoduleInit } from "./operations.js";
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
import { resolveSubmodulePaths } from "./paths.js";

/**
 * Implementation of SubmoduleProcessor.
 */
export class SubmoduleProcessorImpl implements SubmoduleProcessor {
  private readonly logger: Logger;
  private readonly context: ExecutionContext;
  private readonly pathCache = new WeakMap<
    Submodule,
    { absolutePath: string; normalizedSubmodule: Submodule }
  >();

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
    this.validateAndLogPaths(submodule);

    const { absolutePath } = this.getCachedPaths(submodule);

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

    this.logPlanDetails(finalPlan);

    return finalPlan;
  }

  private getCachedPaths(submodule: Submodule): {
    absolutePath: string;
    normalizedSubmodule: Submodule;
  } {
    let cached = this.pathCache.get(submodule);
    if (!cached) {
      cached = resolveSubmodulePaths(submodule, this.context);
      this.pathCache.set(submodule, cached);
    }
    return cached;
  }

  private validateAndLogPaths(submodule: Submodule): void {
    if (submodule.path.startsWith("/")) {
      this.logger.warn(
        `Submodule '${submodule.name}' has absolute path; this will be normalized to relative`,
      );
    }
  }

  private logPlanDetails(plan: SubmoduleUpdatePlan): void {
    this.logger.debug(`Update plan prepared for ${plan.submodule.name}:`, {
      branch: plan.branch.branch,
      source: plan.branch.source,
      needsInit: plan.needsInit,
      hasCurrentSha: Boolean(plan.currentSha),
    });

    if (plan.currentSha) {
      this.logger.debug(
        `Current SHA for ${plan.submodule.name}: ${plan.currentSha}`,
      );
    }
  }
}
