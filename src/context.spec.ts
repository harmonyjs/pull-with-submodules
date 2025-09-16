/**
 * @fileoverview Unit tests for execution context factory.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createContext } from './context.js';
import { parseArgv } from './cli.js';

void test('context: creates execution context (happy path)', () => {
  const opts = parseArgv(['--dry-run', '--verbose']);
  const ctx = createContext(opts, '/tmp');
  assert.equal(ctx.dryRun, true);
  assert.equal(ctx.verbose, true);
  assert.equal(ctx.repositoryRoot, '/tmp');
});

void test('context: throws on relative repositoryRoot', () => {
  const opts = parseArgv([]);
  assert.throws(() => createContext(opts, 'relative/path'), /absolute/);
});
