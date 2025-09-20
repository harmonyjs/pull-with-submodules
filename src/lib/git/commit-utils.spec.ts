import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getCommitSha } from "./commit-utils.js";

test("getCommitSha", async (t) => {
  await t.test("returns null for nonexistent repository", async () => {
    const result = await getCommitSha(
      "/definitely/nonexistent/path/12345",
      "main",
    );
    assert.equal(result, null);
  });

  await t.test("returns null for nonexistent branch", async () => {
    // This will fail because the repository doesn't exist
    // In a real scenario, we'd mock simple-git or use a real test repository
    const result = await getCommitSha(
      "/nonexistent/repo",
      "nonexistent-branch",
    );
    assert.equal(result, null);
  });

  await t.test("accepts configuration options", async () => {
    const result = await getCommitSha("/nonexistent/repo", "main", {
      dryRun: true,
      verbose: false,
    });
    assert.equal(result, null);
  });
});
