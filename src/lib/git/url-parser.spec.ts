import { strict as assert } from "node:assert";
import { test } from "node:test";
import { extractRepoName } from "./url-parser.js";
import { GitOperationError } from "#errors/index.js";

test("extractRepoName - GitHub HTTPS URLs", () => {
  assert.equal(extractRepoName("https://github.com/user/repo.git"), "repo");
  assert.equal(extractRepoName("https://github.com/user/repo"), "repo");
  assert.equal(
    extractRepoName("https://github.com/org/project-name.git"),
    "project-name",
  );
});

test("extractRepoName - GitHub SSH URLs", () => {
  assert.equal(extractRepoName("git@github.com:user/repo.git"), "repo");
  assert.equal(extractRepoName("git@github.com:user/repo"), "repo");
  assert.equal(
    extractRepoName("git@gitlab.com:org/my-project.git"),
    "my-project",
  );
});

test("extractRepoName - local paths", () => {
  assert.equal(extractRepoName("/path/to/repo"), "repo");
  assert.equal(extractRepoName("/path/to/repo.git"), "repo");
  assert.equal(extractRepoName("../sibling-repo"), "sibling-repo");
});

test("extractRepoName - edge cases", () => {
  assert.equal(extractRepoName("repo"), "repo");
  assert.equal(extractRepoName("repo.git"), "repo");
  assert.equal(extractRepoName("complex-repo-name.git"), "complex-repo-name");
});

test("extractRepoName - trailing slash handling", () => {
  assert.equal(extractRepoName("https://github.com/user/repo/"), "repo");
  assert.equal(extractRepoName("https://github.com/user/repo.git/"), "repo");
});

test("extractRepoName - invalid inputs", () => {
  assert.throws(
    () => extractRepoName(""),
    (error: unknown) => {
      return (
        error instanceof GitOperationError &&
        error.message.includes("Repository URL cannot be empty")
      );
    },
  );

  assert.throws(
    () => extractRepoName("   "),
    (error: unknown) => {
      return (
        error instanceof GitOperationError &&
        error.message.includes("Repository URL cannot be empty")
      );
    },
  );

  // Test edge case that extracts to valid name
  assert.equal(extractRepoName("https://github.com/"), "github.com");

  // Test truly invalid case
  assert.throws(
    () => extractRepoName("/.git"),
    (error: unknown) => {
      return (
        error instanceof GitOperationError &&
        error.message.includes("Cannot extract repository name")
      );
    },
  );
});

test("extractRepoName - complex repository names", () => {
  assert.equal(
    extractRepoName("https://github.com/user/my-awesome-project.git"),
    "my-awesome-project",
  );
  assert.equal(
    extractRepoName("git@bitbucket.org:team/service_name.git"),
    "service_name",
  );
  assert.equal(
    extractRepoName("/workspace/pull-with-submodules"),
    "pull-with-submodules",
  );
});
