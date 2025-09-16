/**
 * @fileoverview Unit tests for CLI parsing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgv } from './cli.js';

void test('cli: defaults when no flags provided', () => {
  const opts = parseArgv([]);
  assert.deepEqual(opts, {
    dryRun: false,
    noCommit: false,
    forceRemote: false,
    parallel: false,
    verbose: false,
  });
});

void test('cli: long form flags', () => {
  const opts = parseArgv(['--dry-run', '--no-commit', '--force-remote', '--parallel', '--verbose']);
  assert.equal(opts.dryRun, true);
  assert.equal(opts.noCommit, true);
  assert.equal(opts.forceRemote, true);
  assert.equal(opts.parallel, true);
  assert.equal(opts.verbose, true);
});

void test('cli: short aliases', () => {
  const opts = parseArgv(['-d', '-n', '-r', '-p', '-v']);
  assert.equal(opts.dryRun, true);
  assert.equal(opts.noCommit, true);
  assert.equal(opts.forceRemote, true);
  assert.equal(opts.parallel, true);
  assert.equal(opts.verbose, true);
});

void test('cli: unknown flags ignored', () => {
  const opts = parseArgv(['--unknown', '--dry-run']);
  assert.equal(opts.dryRun, true);
});

void test('cli: mixed presence', () => {
  const opts = parseArgv(['--dry-run', '--parallel']);
  assert.equal(opts.dryRun, true);
  assert.equal(opts.parallel, true);
  assert.equal(opts.noCommit, false);
});
