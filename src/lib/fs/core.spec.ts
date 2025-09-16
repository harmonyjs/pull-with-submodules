/**
 * @fileoverview Unit tests for filesystem utilities.
 */

import { describe, it } from "node:test";
import { strictEqual, throws, ok } from "node:assert";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

 
const __filename = fileURLToPath(import.meta.url);
 
const __dirname = dirname(__filename);
import { fileExists, isDirectory, resolveAbsolutePath } from "./core.js";

describe("fs-utils", () => {
  describe("fileExists", () => {
    it("should return true for existing file", async () => {
      const exists = await fileExists(__filename);
      strictEqual(exists, true);
    });

    it("should return false for non-existing file", async () => {
      const exists = await fileExists("/non-existing-file-12345.txt");
      strictEqual(exists, false);
    });
  });

  describe("isDirectory", () => {
    it("should return true for existing directory", async () => {
      const isDir = await isDirectory(__dirname);
      strictEqual(isDir, true);
    });

    it("should return false for file", async () => {
      const isDir = await isDirectory(__filename);
      strictEqual(isDir, false);
    });

    it("should return false for non-existing path", async () => {
      const isDir = await isDirectory("/non-existing-directory-12345");
      strictEqual(isDir, false);
    });
  });

  describe("resolveAbsolutePath", () => {
    const baseDir = "/project/root";

    it("should resolve relative path within base directory", () => {
      const result = resolveAbsolutePath("submodules/lib", baseDir);
      strictEqual(result, "/project/root/submodules/lib");
    });

    it("should throw for path traversal attempts", () => {
      throws(
        () => resolveAbsolutePath("../../../etc/passwd", baseDir),
        /Path '\.\.\/\.\.\/\.\.\/etc\/passwd' resolves outside base directory/,
      );
    });

    it("should use current working directory as default", () => {
      const result = resolveAbsolutePath("test");
      ok(result.startsWith(process.cwd()));
      ok(result.endsWith("/test"));
    });
  });
});
