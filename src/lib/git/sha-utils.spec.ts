/**
 * @fileoverview Tests for Git SHA validation utilities.
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { GitOperationError } from "../../errors/index.js";
import { isValidSha, isGitSha, asGitSha } from "./sha-utils.js";

test("isValidSha - valid SHA formats", () => {
  // Full SHA (40 characters)
  assert.ok(isValidSha("a1b2c3d4e5f6789012345678901234567890abcd"));
  assert.ok(isValidSha("0123456789abcdef0123456789abcdef01234567"));

  // Abbreviated SHA (7-39 characters)
  assert.ok(isValidSha("a1b2c3d")); // 7 chars (minimum)
  assert.ok(isValidSha("a1b2c3d4e5f")); // 11 chars
  assert.ok(isValidSha("a1b2c3d4e5f6789012345678901234567890abc")); // 39 chars

  // Mixed case (should be case insensitive)
  assert.ok(isValidSha("A1B2C3D"));
  assert.ok(isValidSha("a1B2c3D4E5f"));
});

test("isValidSha - invalid SHA formats", () => {
  // Too short
  assert.equal(isValidSha(""), false);
  assert.equal(isValidSha("a1b2c3"), false); // 6 chars
  assert.equal(isValidSha("123"), false);

  // Too long
  assert.equal(isValidSha("a1b2c3d4e5f6789012345678901234567890abcde"), false); // 41 chars

  // Invalid characters
  assert.equal(isValidSha("g1b2c3d"), false); // 'g' is not hex
  assert.equal(isValidSha("a1b2c3d-"), false); // contains dash
  assert.equal(isValidSha("a1b2c3d "), false); // contains space
  assert.equal(isValidSha("a1b2c3d!"), false); // contains special char
  assert.equal(isValidSha("a1b2c3d🎉"), false); // contains emoji

  // Non-string values should return false
  assert.equal(isValidSha("not-hex"), false);
  assert.equal(isValidSha("ZZZZZZ"), false);
});

test("isGitSha type guard - valid cases", () => {
  const validSha = "a1b2c3d4e5f";

  assert.ok(isGitSha(validSha));
  assert.ok(isGitSha("a1b2c3d"));
  assert.ok(isGitSha("0123456789abcdef0123456789abcdef01234567"));

  // Type narrowing test
  const unknownValue: unknown = "a1b2c3d";
  if (isGitSha(unknownValue)) {
    // This should compile without type assertion
    const sha: string = unknownValue; // This proves the type guard works
    assert.ok(sha.length >= 7);
  }
});

test("isGitSha type guard - invalid cases", () => {
  assert.equal(isGitSha(""), false);
  assert.equal(isGitSha("invalid"), false);
  assert.equal(isGitSha("123"), false);
  assert.equal(isGitSha("g1b2c3d"), false);

  // Non-string types
  assert.equal(isGitSha(123), false);
  assert.equal(isGitSha(null), false);
  assert.equal(isGitSha(undefined), false);
  assert.equal(isGitSha({}), false);
  assert.equal(isGitSha([]), false);
  assert.equal(isGitSha(true), false);
});

test("asGitSha - successful conversion", () => {
  const validSha = "a1b2c3d4e5f";
  const result = asGitSha(validSha);

  assert.equal(result, validSha);
  // The returned value should be typed as GitSha (compile-time check)
});

test("asGitSha - various valid formats", () => {
  assert.doesNotThrow(() => asGitSha("a1b2c3d"));
  assert.doesNotThrow(() => asGitSha("A1B2C3D"));
  assert.doesNotThrow(() =>
    asGitSha("0123456789abcdef0123456789abcdef01234567"),
  );
  assert.doesNotThrow(() =>
    asGitSha("a1b2c3d4e5f6789012345678901234567890abc"),
  );
});

test("asGitSha - throws GitOperationError for invalid SHA", () => {
  assert.throws(
    () => asGitSha("invalid"),
    (error: unknown) => {
      assert.ok(error instanceof GitOperationError);
      const gitError = error as GitOperationError;
      assert.ok(gitError.message.includes("Invalid Git SHA format"));
      assert.ok(gitError.message.includes("invalid"));

      // Check error details
      const details = (gitError as any).details;
      assert.ok(details);
      assert.equal(details.sha, "invalid");
      assert.ok(details.expectedFormat);

      // Check suggestions
      const suggestions = (gitError as any).suggestions;
      assert.ok(Array.isArray(suggestions));
      assert.ok(suggestions.length > 0);
      assert.ok(suggestions.some((s: string) => s.includes("hexadecimal")));

      return true;
    },
  );
});

test("asGitSha - error cases", () => {
  const invalidCases = [
    "",
    "123", // too short
    "g1b2c3d", // invalid character
    "a1b2c3d!", // special character
    "not-a-sha", // completely invalid
    "a1b2c3d4e5f6789012345678901234567890abcde", // too long
  ];

  for (const invalidSha of invalidCases) {
    assert.throws(
      () => asGitSha(invalidSha),
      GitOperationError,
      `Should throw for invalid SHA: ${invalidSha}`,
    );
  }
});

test("SHA validation edge cases", () => {
  // Exactly 7 characters (minimum valid)
  assert.ok(isValidSha("a1b2c3d"));
  assert.doesNotThrow(() => asGitSha("a1b2c3d"));

  // Exactly 40 characters (maximum valid)
  const fullSha = "a1b2c3d4e5f6789012345678901234567890abcd";
  assert.equal(fullSha.length, 40);
  assert.ok(isValidSha(fullSha));
  assert.doesNotThrow(() => asGitSha(fullSha));

  // Just below minimum (6 characters)
  assert.equal(isValidSha("a1b2c3"), false);
  assert.throws(() => asGitSha("a1b2c3"), GitOperationError);

  // Just above maximum (41 characters)
  const tooLong = fullSha + "e";
  assert.equal(tooLong.length, 41);
  assert.equal(isValidSha(tooLong), false);
  assert.throws(() => asGitSha(tooLong), GitOperationError);
});
