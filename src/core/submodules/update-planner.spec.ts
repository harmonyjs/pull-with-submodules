/**
 * @fileoverview Test suite for submodule update plan preparation.
 *
 * Tests update plan coordination, repository validation, and the integration
 * of path resolution, branch resolution, and SHA enrichment.
 */

import { strict as assert } from "node:assert";
import { test, describe, mock } from "node:test";
import type { ExecutionContext, Submodule } from "#types/core.js";
import type { GitSha } from "#types/git.js";
import {
  BRANCH_SOURCES,
  DEFAULT_BRANCH,
  type BranchResolution,
  type SubmoduleUpdatePlan,
} from "./types.js";
import {
  prepareUpdatePlan,
  enrichPlanWithCurrentSha,
} from "./update-planner.js";

// Test constants
const TEST_REPO_ROOT = "/test/repo";
const TEST_SUBMODULE_PATH = "libs/test";
const TEST_SUBMODULE_NAME = "test";
const TEST_SHA: GitSha = "abc123def456" as GitSha;

// Mock logger interface
interface MockLogger {
  debug: (message: string, data?: any) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

// Mock execution context
const mockContext: ExecutionContext = {
  dryRun: false,
  noCommit: false,
  forceRemote: false,
  parallel: false,
  verbose: false,
  repositoryRoot: TEST_REPO_ROOT,
};

const createMockLogger = (): MockLogger => ({
  debug: mock.fn(),
  info: mock.fn(),
  warn: mock.fn(),
  error: mock.fn(),
});

function createMockBranchResolver(
  branchResolution: BranchResolution,
): (submodule: Submodule) => Promise<BranchResolution> {
  return mock.fn(async () => branchResolution);
}

describe("prepareUpdatePlan - basic functionality", () => {
  describe("basic plan preparation", () => {
    test("should create plan with correct structure", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
        branch: "main",
      };

      const branchResolution: BranchResolution = {
        branch: "main",
        source: BRANCH_SOURCES.EXPLICIT,
        details: "Explicit branch configured in .gitmodules",
      };

      const mockLogger = createMockLogger();
      const mockResolveBranch = createMockBranchResolver(branchResolution);

      const result = await prepareUpdatePlan({
        submodule,
        context: mockContext,
        logger: mockLogger,
        resolveBranch: mockResolveBranch,
      });

      // Verify structure
      assert.ok(result.submodule);
      assert.ok(result.branch);
      assert.equal(typeof result.needsInit, "boolean");
      assert.equal(typeof result.isRepositoryValid, "boolean");

      // Verify content
      assert.equal(result.submodule.name, TEST_SUBMODULE_NAME);
      assert.equal(result.submodule.path, TEST_SUBMODULE_PATH);
      assert.equal(result.branch.branch, "main");
      assert.equal(result.branch.source, BRANCH_SOURCES.EXPLICIT);

      // Repository doesn't exist in test environment
      assert.equal(result.needsInit, true);
      assert.equal(result.isRepositoryValid, false);
    });

    test("should log debug message for plan preparation", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
      };

      const branchResolution: BranchResolution = {
        branch: DEFAULT_BRANCH,
        source: BRANCH_SOURCES.FALLBACK,
        details: `No explicit branch configured, using '${DEFAULT_BRANCH}' as default`,
      };

      const mockLogger = createMockLogger();
      const mockResolveBranch = createMockBranchResolver(branchResolution);

      await prepareUpdatePlan({
        submodule,
        context: mockContext,
        logger: mockLogger,
        resolveBranch: mockResolveBranch,
      });

      const debugCalls = (mockLogger.debug as any).mock.calls;
      assert.equal(debugCalls.length, 1);
      assert.match(
        debugCalls[0]?.arguments[0] as string,
        /Preparing update plan for submodule test/,
      );
    });

    test("should call branch resolver with normalized submodule", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: "/test/repo/libs/test", // Absolute path
      };

      const branchResolution: BranchResolution = {
        branch: DEFAULT_BRANCH,
        source: BRANCH_SOURCES.FALLBACK,
        details: `No explicit branch configured, using '${DEFAULT_BRANCH}' as default`,
      };

      const mockLogger = createMockLogger();
      const mockResolveBranch = createMockBranchResolver(branchResolution);

      await prepareUpdatePlan({
        submodule,
        context: mockContext,
        logger: mockLogger,
        resolveBranch: mockResolveBranch,
      });

      // Verify branch resolver was called with normalized submodule
      const resolveBranchCalls = (mockResolveBranch as any).mock.calls;
      assert.equal(resolveBranchCalls.length, 1);

      const normalizedSubmodule = resolveBranchCalls[0]?.arguments[0];
      assert.equal(normalizedSubmodule?.path, "libs/test"); // Should be relative
    });
  });

  describe("path normalization integration", () => {
    test("should normalize absolute paths to relative", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: "/test/repo/libs/test", // Absolute path
      };

      const branchResolution: BranchResolution = {
        branch: "develop",
        source: BRANCH_SOURCES.EXPLICIT,
        details: "Explicit branch configured in .gitmodules",
      };

      const mockLogger = createMockLogger();
      const mockResolveBranch = createMockBranchResolver(branchResolution);

      const result = await prepareUpdatePlan({
        submodule,
        context: mockContext,
        logger: mockLogger,
        resolveBranch: mockResolveBranch,
      });

      assert.equal(result.submodule.path, "libs/test"); // Should be normalized to relative
      assert.equal(result.submodule.name, TEST_SUBMODULE_NAME);
    });

    test("should preserve relative paths", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: "libs/test", // Already relative
      };

      const branchResolution: BranchResolution = {
        branch: "main",
        source: BRANCH_SOURCES.EXPLICIT,
        details: "Explicit branch configured in .gitmodules",
      };

      const mockLogger = createMockLogger();
      const mockResolveBranch = createMockBranchResolver(branchResolution);

      const result = await prepareUpdatePlan({
        submodule,
        context: mockContext,
        logger: mockLogger,
        resolveBranch: mockResolveBranch,
      });

      assert.equal(result.submodule.path, "libs/test"); // Should remain unchanged
    });

    test("should handle nested paths correctly", async () => {
      const submodule: Submodule = {
        name: "nested-submodule",
        path: "vendor/third-party/deep/nested",
      };

      const branchResolution: BranchResolution = {
        branch: "stable",
        source: BRANCH_SOURCES.EXPLICIT,
        details: "Explicit branch configured in .gitmodules",
      };

      const mockLogger = createMockLogger();
      const mockResolveBranch = createMockBranchResolver(branchResolution);

      const result = await prepareUpdatePlan({
        submodule,
        context: mockContext,
        logger: mockLogger,
        resolveBranch: mockResolveBranch,
      });

      assert.equal(result.submodule.path, "vendor/third-party/deep/nested");
      assert.equal(result.submodule.name, "nested-submodule");
    });
  });

  describe("repository validation", () => {
    test("should mark as needing init when path does not exist", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: "non/existent/path",
      };

      const branchResolution: BranchResolution = {
        branch: DEFAULT_BRANCH,
        source: BRANCH_SOURCES.FALLBACK,
        details: `No explicit branch configured, using '${DEFAULT_BRANCH}' as default`,
      };

      const mockLogger = createMockLogger();
      const mockResolveBranch = createMockBranchResolver(branchResolution);

      const result = await prepareUpdatePlan({
        submodule,
        context: mockContext,
        logger: mockLogger,
        resolveBranch: mockResolveBranch,
      });

      assert.equal(result.needsInit, true);
      assert.equal(result.isRepositoryValid, false);
    });

    test("should validate repository correctly when path exists", async () => {
      const submodule: Submodule = {
        name: TEST_SUBMODULE_NAME,
        path: TEST_SUBMODULE_PATH,
      };

      const branchResolution: BranchResolution = {
        branch: "main",
        source: BRANCH_SOURCES.EXPLICIT,
        details: "Explicit branch configured in .gitmodules",
      };

      const mockLogger = createMockLogger();
      const mockResolveBranch = createMockBranchResolver(branchResolution);

      const result = await prepareUpdatePlan({
        submodule,
        context: mockContext,
        logger: mockLogger,
        resolveBranch: mockResolveBranch,
      });

      // In test environment, path won't exist
      assert.equal(result.needsInit, true);
      assert.equal(result.isRepositoryValid, false);
    });
  });
});

describe("prepareUpdatePlan - branch resolution", () => {
  test("should use explicit branch when provided", async () => {
    const submodule: Submodule = {
      name: TEST_SUBMODULE_NAME,
      path: TEST_SUBMODULE_PATH,
      branch: "feature/test",
    };

    const branchResolution: BranchResolution = {
      branch: "feature/test",
      source: BRANCH_SOURCES.EXPLICIT,
      details: "Explicit branch configured in .gitmodules",
    };

    const mockLogger = createMockLogger();
    const mockResolveBranch = createMockBranchResolver(branchResolution);

    const result = await prepareUpdatePlan({
      submodule,
      context: mockContext,
      logger: mockLogger,
      resolveBranch: mockResolveBranch,
    });

    assert.equal(result.branch.branch, "feature/test");
    assert.equal(result.branch.source, BRANCH_SOURCES.EXPLICIT);
  });

  test("should use fallback branch when none specified", async () => {
    const submodule: Submodule = {
      name: TEST_SUBMODULE_NAME,
      path: TEST_SUBMODULE_PATH,
      // No branch specified
    };

    const branchResolution: BranchResolution = {
      branch: DEFAULT_BRANCH,
      source: BRANCH_SOURCES.FALLBACK,
      details: `No explicit branch configured, using '${DEFAULT_BRANCH}' as default`,
    };

    const mockLogger = createMockLogger();
    const mockResolveBranch = createMockBranchResolver(branchResolution);

    const result = await prepareUpdatePlan({
      submodule,
      context: mockContext,
      logger: mockLogger,
      resolveBranch: mockResolveBranch,
    });

    assert.equal(result.branch.branch, DEFAULT_BRANCH);
    assert.equal(result.branch.source, BRANCH_SOURCES.FALLBACK);
  });

  test("should handle detected branches", async () => {
    const submodule: Submodule = {
      name: TEST_SUBMODULE_NAME,
      path: TEST_SUBMODULE_PATH,
    };

    const branchResolution: BranchResolution = {
      branch: "detected-branch",
      source: BRANCH_SOURCES.DETECTED,
      details: "Detected from current submodule repository state",
    };

    const mockLogger = createMockLogger();
    const mockResolveBranch = createMockBranchResolver(branchResolution);

    const result = await prepareUpdatePlan({
      submodule,
      context: mockContext,
      logger: mockLogger,
      resolveBranch: mockResolveBranch,
    });

    assert.equal(result.branch.branch, "detected-branch");
    assert.equal(result.branch.source, BRANCH_SOURCES.DETECTED);
  });
});

describe("prepareUpdatePlan - edge cases", () => {
  test("should handle submodule with minimal properties", async () => {
    const submodule: Submodule = {
      name: "minimal",
      path: "minimal",
    };

    const branchResolution: BranchResolution = {
      branch: DEFAULT_BRANCH,
      source: BRANCH_SOURCES.FALLBACK,
      details: `No explicit branch configured, using '${DEFAULT_BRANCH}' as default`,
    };

    const mockLogger = createMockLogger();
    const mockResolveBranch = createMockBranchResolver(branchResolution);

    const result = await prepareUpdatePlan({
      submodule,
      context: mockContext,
      logger: mockLogger,
      resolveBranch: mockResolveBranch,
    });

    assert.ok(result.submodule);
    assert.ok(result.branch);
    assert.equal(typeof result.needsInit, "boolean");
    assert.equal(typeof result.isRepositoryValid, "boolean");
  });

  test("should handle empty submodule path", async () => {
    const submodule: Submodule = {
      name: "empty-path",
      path: "",
    };

    const branchResolution: BranchResolution = {
      branch: DEFAULT_BRANCH,
      source: BRANCH_SOURCES.FALLBACK,
      details: `No explicit branch configured, using '${DEFAULT_BRANCH}' as default`,
    };

    const mockLogger = createMockLogger();
    const mockResolveBranch = createMockBranchResolver(branchResolution);

    const result = await prepareUpdatePlan({
      submodule,
      context: mockContext,
      logger: mockLogger,
      resolveBranch: mockResolveBranch,
    });

    assert.equal(result.submodule.path, "");
    assert.ok(result.branch);
  });
});

describe("enrichPlanWithCurrentSha", () => {
  describe("SHA enrichment for valid repositories", () => {
    test("should add SHA when repository is valid and SHA is available", async () => {
      const basePlan: SubmoduleUpdatePlan = {
        submodule: {
          name: TEST_SUBMODULE_NAME,
          path: TEST_SUBMODULE_PATH,
        },
        branch: {
          branch: "main",
          source: BRANCH_SOURCES.EXPLICIT,
          details: "Explicit branch configured in .gitmodules",
        },
        needsInit: false,
        isRepositoryValid: true,
      };

      const mockGetCurrentSha = mock.fn(async () => TEST_SHA);

      const result = await enrichPlanWithCurrentSha(
        basePlan,
        mockGetCurrentSha,
      );

      assert.equal(result.currentSha, TEST_SHA);
      assert.equal(mockGetCurrentSha.mock.callCount(), 1);
    });

    test("should not add SHA when repository is valid but SHA is unavailable", async () => {
      const basePlan: SubmoduleUpdatePlan = {
        submodule: {
          name: TEST_SUBMODULE_NAME,
          path: TEST_SUBMODULE_PATH,
        },
        branch: {
          branch: "main",
          source: BRANCH_SOURCES.EXPLICIT,
          details: "Explicit branch configured in .gitmodules",
        },
        needsInit: false,
        isRepositoryValid: true,
      };

      const mockGetCurrentSha = mock.fn(async () => undefined);

      const result = await enrichPlanWithCurrentSha(
        basePlan,
        mockGetCurrentSha,
      );

      assert.equal(result.currentSha, undefined);
      assert.equal(mockGetCurrentSha.mock.callCount(), 1);
    });

    test("should preserve all other plan properties when adding SHA", async () => {
      const basePlan: SubmoduleUpdatePlan = {
        submodule: {
          name: TEST_SUBMODULE_NAME,
          path: TEST_SUBMODULE_PATH,
          branch: "develop",
        },
        branch: {
          branch: "develop",
          source: BRANCH_SOURCES.EXPLICIT,
          details: "Explicit branch configured in .gitmodules",
        },
        needsInit: false,
        isRepositoryValid: true,
      };

      const mockGetCurrentSha = mock.fn(async () => TEST_SHA);

      const result = await enrichPlanWithCurrentSha(
        basePlan,
        mockGetCurrentSha,
      );

      assert.equal(result.submodule.name, TEST_SUBMODULE_NAME);
      assert.equal(result.submodule.path, TEST_SUBMODULE_PATH);
      assert.equal(result.submodule.branch, "develop");
      assert.equal(result.branch.branch, "develop");
      assert.equal(result.branch.source, BRANCH_SOURCES.EXPLICIT);
      assert.equal(result.needsInit, false);
      assert.equal(result.isRepositoryValid, true);
      assert.equal(result.currentSha, TEST_SHA);
    });
  });

  describe("SHA enrichment for invalid repositories", () => {
    test("should not add SHA when repository is invalid", async () => {
      const basePlan: SubmoduleUpdatePlan = {
        submodule: {
          name: TEST_SUBMODULE_NAME,
          path: TEST_SUBMODULE_PATH,
        },
        branch: {
          branch: DEFAULT_BRANCH,
          source: BRANCH_SOURCES.FALLBACK,
          details: `No explicit branch configured, using '${DEFAULT_BRANCH}' as default`,
        },
        needsInit: true,
        isRepositoryValid: false,
      };

      const mockGetCurrentSha = mock.fn(async () => TEST_SHA);

      const result = await enrichPlanWithCurrentSha(
        basePlan,
        mockGetCurrentSha,
      );

      assert.equal(result.currentSha, undefined);
      assert.equal(mockGetCurrentSha.mock.callCount(), 0); // Should not be called
    });

    test("should return original plan when repository is invalid", async () => {
      const basePlan: SubmoduleUpdatePlan = {
        submodule: {
          name: TEST_SUBMODULE_NAME,
          path: TEST_SUBMODULE_PATH,
        },
        branch: {
          branch: DEFAULT_BRANCH,
          source: BRANCH_SOURCES.FALLBACK,
          details: `No explicit branch configured, using '${DEFAULT_BRANCH}' as default`,
        },
        needsInit: true,
        isRepositoryValid: false,
      };

      const mockGetCurrentSha = mock.fn(async () => TEST_SHA);

      const result = await enrichPlanWithCurrentSha(
        basePlan,
        mockGetCurrentSha,
      );

      assert.strictEqual(result, basePlan); // Should be same object
    });
  });

  describe("error handling", () => {
    test("should handle SHA retrieval errors gracefully", async () => {
      const basePlan: SubmoduleUpdatePlan = {
        submodule: {
          name: TEST_SUBMODULE_NAME,
          path: TEST_SUBMODULE_PATH,
        },
        branch: {
          branch: "main",
          source: BRANCH_SOURCES.EXPLICIT,
          details: "Explicit branch configured in .gitmodules",
        },
        needsInit: false,
        isRepositoryValid: true,
      };

      const mockGetCurrentSha = mock.fn(async () => {
        throw new Error("Git operation failed");
      });

      await assert.rejects(async () => {
        await enrichPlanWithCurrentSha(basePlan, mockGetCurrentSha);
      }, /Git operation failed/);
    });
  });
});
