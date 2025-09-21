/**
 * @fileoverview Next steps suggestions for user guidance.
 *
 * Provides contextual "next steps" suggestions based on the current execution
 * state, helping users understand what actions they should take after the
 * operation completes. Shows different suggestions for dry-run mode,
 * repository state, conflicts, and other scenarios.
 */

import type { ExecutionContext, UpdateResult } from "#types/core";
import type { ExecutionResult } from "#orchestrator/index";
import type { PullResult } from "#lib/git/operations";
import { symbols, status } from "./colors.js";

/**
 * Next step suggestion with description.
 */
export interface NextStep {
  /** Action to perform */
  readonly action: string;
  /** Description of why this action is needed */
  readonly reason?: string;
}

/**
 * Context for generating next steps suggestions.
 */
export interface NextStepsContext {
  /** Execution context with user preferences */
  readonly execution: ExecutionContext;
  /** Final execution result */
  readonly result: ExecutionResult;
  /** Submodule processing results */
  readonly submoduleResults: readonly UpdateResult[];
  /** Pull operation result if available */
  readonly pullResult?: PullResult;
}

/**
 * Generates contextual next steps suggestions.
 *
 * @param context - Context information for generating suggestions
 * @returns Array of next step suggestions
 */
export function generateNextSteps(context: NextStepsContext): NextStep[] {
  const steps: NextStep[] = [];

  // Dry-run mode: suggest real execution
  if (context.execution.dryRun) {
    steps.push({
      action: "Re-run without --dry-run to apply changes",
      reason: "This was a preview run - no actual changes were made",
    });
  }

  // Repository ahead: suggest push
  const aheadCount = context.pullResult?.ahead ?? 0;
  if (context.pullResult?.status === "ahead" && aheadCount > 0) {
    steps.push({
      action: `git push`,
      reason: `Repository is ahead by ${aheadCount} commits`,
    });
  }

  // Repository diverged: suggest resolution
  if (context.pullResult?.status === "diverged") {
    steps.push({
      action: "Resolve diverged history",
      reason: "Local and remote branches have diverged",
    });
    steps.push({
      action: "Consider: git rebase origin/main",
      reason: "To replay local commits on top of remote changes",
    });
  }

  // Failed submodules: suggest investigation
  const failedSubmodules = context.submoduleResults.filter(r => r.status === "failed");
  if (failedSubmodules.length > 0) {
    steps.push({
      action: "Investigate failed submodules",
      reason: `${failedSubmodules.length} submodule(s) failed to update`,
    });

    const maxFailuresToShow = 3;
    for (const failed of failedSubmodules.slice(0, maxFailuresToShow)) {
      const errorMessage = failed.error?.message ?? "Unknown error";
      steps.push({
        action: `Check ${failed.submodule.path}`,
        reason: errorMessage !== "" ? errorMessage : "Unknown error",
      });
    }
  }

  // Conflicts detected: suggest resolution steps
  if (context.result.errors.some(e => e.message.includes("conflict"))) {
    steps.push({
      action: "Resolve merge conflicts",
      reason: "Conflicts were detected during the operation",
    });
    steps.push({
      action: "git rebase --continue",
      reason: "After resolving conflicts",
    });
    steps.push({
      action: "git rebase --abort",
      reason: "To cancel the rebase if conflicts cannot be resolved",
    });
  }

  // No changes but successful: suggest regular workflow
  if (context.result.success && context.result.submodules.updated === 0 && !context.execution.dryRun) {
    steps.push({
      action: "Continue development",
      reason: "All repositories are up-to-date",
    });
  }

  // Successful updates: suggest testing
  if (context.result.success && context.result.submodules.updated > 0 && !context.execution.dryRun) {
    steps.push({
      action: "Test your application",
      reason: `${context.result.submodules.updated} submodule(s) were updated`,
    });
  }

  return steps;
}

/**
 * Formats next steps for display to the user.
 *
 * @param steps - Array of next step suggestions
 * @returns Formatted string for display
 */
export function formatNextSteps(steps: NextStep[]): string {
  if (steps.length === 0) {
    return "No specific next steps required.";
  }

  const formatted = steps.map((step) => {
    const bullet = symbols.step;
    const actionText = status.info(step.action);
    const reason = step.reason ?? "";
    const reasonText = reason !== "" ? status.muted(` (${reason})`) : "";
    return `${bullet} ${actionText}${reasonText}`;
  }).join("\n");

  return formatted;
}

/**
 * Shows next steps suggestions to the user.
 *
 * @param context - Context for generating suggestions
 * @returns Formatted next steps string
 */
export function showNextSteps(context: NextStepsContext): string {
  const steps = generateNextSteps(context);
  return formatNextSteps(steps);
}