/**
 * @fileoverview Unit tests for gitmodules parser.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import { strictEqual, throws, ok } from "node:assert";
import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Standard ESM file path resolution pattern for Node.js modules
// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = dirname(__filename);
import { parseGitmodules, readGitmodules } from "./gitmodules.js";

describe("gitmodules-parser", () => {
  describe("parseGitmodules", () => {
    it("should parse simple gitmodules content", () => {
      const content = `
[submodule "lib1"]
\tpath = lib/lib1
\turl = https://github.com/example/lib1.git

[submodule "lib2"]
\tpath = lib/lib2
\turl = https://github.com/example/lib2.git
\tbranch = develop
      `.trim();

      const result = parseGitmodules(content);
      strictEqual(result.length, 2);

      const entry1 = result[0];
      const entry2 = result[1];
      ok(entry1);
      ok(entry2);

      strictEqual(entry1.name, "lib1");
      strictEqual(entry1.url, "https://github.com/example/lib1.git");
      strictEqual(entry2.name, "lib2");
      strictEqual(entry2.branch, "develop");
    });

    it("should handle empty content", () => {
      const result = parseGitmodules("");
      strictEqual(result.length, 0);
    });

    it("should skip invalid entries when skipInvalid is true", () => {
      const content = `
[submodule "complete"]
\tpath = lib/complete
\turl = https://github.com/example/complete.git

[submodule "missing-path"]
\turl = https://github.com/example/missing-path.git
      `.trim();

      const result = parseGitmodules(content, { skipInvalid: true });
      strictEqual(result.length, 1);
      ok(result[0]);
      strictEqual(result[0].name, "complete");
    });

    it("should throw for invalid entries when skipInvalid is false", () => {
      const content = `
[submodule "missing-path"]
\turl = https://github.com/example/missing-path.git
      `.trim();

      throws(
        () => parseGitmodules(content, { skipInvalid: false }),
        /Missing required fields for submodule/,
      );
    });
  });

  describe("readGitmodules", () => {
    const testFile = join(__dirname, "test-gitmodules");
    const testContent = `
[submodule "test-lib"]
\tpath = lib/test-lib
\turl = https://github.com/example/test-lib.git
    `.trim();

    beforeEach(async () => {
      await fs.writeFile(testFile, testContent);
    });

    afterEach(async () => {
      try {
        await fs.unlink(testFile);
      } catch {
        // File might not exist, ignore error
      }
    });

    it("should read and parse existing gitmodules file", async () => {
      const result = await readGitmodules(testFile);

      strictEqual(result.length, 1);
      ok(result[0]);
      strictEqual(result[0].name, "test-lib");
      strictEqual(result[0].path, "lib/test-lib");
      strictEqual(result[0].url, "https://github.com/example/test-lib.git");
    });

    it("should throw for non-existing file", async () => {
      try {
        await readGitmodules("/non-existing-gitmodules");
        ok(false, "Expected error to be thrown");
      } catch (error) {
        ok(error instanceof Error);
        ok(error.message.includes("Gitmodules file not found"));
      }
    });
  });
});
