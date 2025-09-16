/**
 * Flat ESLint config
 *
 * - Opinionated layering for JS (CJS/ESM) plus type-aware 
 *   TS linting scoped to src/**
 *
 * REFERENCES
 * - Flat Config: https://eslint.org/docs/latest/use/configure/configuration-files-new
 * - Type-checked preset: https://typescript-eslint.io/users/configs/#recommended-type-checked
 * - Typed linting prerequisites: https://typescript-eslint.io/linting/typed-linting/
 * - Unicorn plugin: https://github.com/sindresorhus/eslint-plugin-unicorn
 * - Node plugin: https://github.com/eslint-community/eslint-plugin-n
 * - Globals: https://github.com/sindresorhus/globals
 */

// FILE MAP (read top-to-bottom)
// 1) Ignores
// 2) Plugins registration
// 3) Base JS preset (from @eslint/js)
// 4) JS/CJS override
// 5) MJS override
// 6) TypeScript (typed, src/** only)
// 7) Tests/Tools relaxations

// DESIGN PRINCIPLES
// - Predictable layering: each override narrows scope and intent
// - Typed linting where it matters: src/** only
// - Minimal friction in tests/tools: speed and readability over strictness

import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';
import unicorn from 'eslint-plugin-unicorn';
import nodePlugin from 'eslint-plugin-n';

// GLOBS OVERVIEW
// - JS_FILES: classic JS and CommonJS modules
// - MJS_FILES: ESM JavaScript modules (.mjs)
// - TS_SRC_FILES: TypeScript code intended for typed linting (requires tsconfig)
// - TEST_AND_TOOL_FILES: tests and small utilities with relaxed constraints
const NODE_GLOBALS = { ...globals.node };
const JS_FILES = ['**/*.js', '**/*.cjs'];
const MJS_FILES = ['**/*.mjs'];
const TS_SRC_FILES = ['src/**/*.ts'];
const LOGGER_FILE = ['src/logger/index.ts'];
const TEST_AND_TOOL_FILES = [
  '**/*.test.ts',
  '**/*.spec.ts'
];

// Style / baseline rules applied across JS and TS (merged into TS blocks as well)
const STYLE_RULES = {
  'no-duplicate-imports': 'error',
  'no-multi-assign': 'error',
  'no-param-reassign': 'error',
  eqeqeq: ['error', 'always'],
  'max-classes-per-file': ['error', 1],
  'max-depth': ['error', 4],
  'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
  'max-params': ['error', { max: 3 }],
  'prefer-const': 'error',
  'prefer-promise-reject-errors': 'error',
  'require-await': 'off', // Disabled in favor of @typescript-eslint/require-await
  'class-methods-use-this': 'error',
  'consistent-return': 'error',
  'unicorn/filename-case': ['error', { case: 'kebabCase' }],
  'unicorn/prefer-node-protocol': 'error',
  'no-underscore-dangle': 'error',
};

// TypeScript-specific rules (merged atop preset configs for typed linting)
const TS_SPECIFIC_RULES = {
  'no-console': 'error',
  complexity: ['error', 10],
  '@typescript-eslint/no-unused-vars': [
    'error',
    { vars: 'all', args: 'after-used', ignoreRestSiblings: true, caughtErrorsIgnorePattern: '^_' },
  ],
  '@typescript-eslint/explicit-function-return-type': [
    'error',
    { allowExpressions: false, allowHigherOrderFunctions: false },
  ],
  '@typescript-eslint/explicit-module-boundary-types': 'error',
  '@typescript-eslint/require-await': 'error',
  '@typescript-eslint/switch-exhaustiveness-check': 'error',
  '@typescript-eslint/strict-boolean-expressions': [
    'error',
    { allowString: false, allowNumber: false, allowNullableBoolean: false },
  ],
  '@typescript-eslint/no-non-null-assertion': 'error',
  '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', disallowTypeAnnotations: false }],
  '@typescript-eslint/consistent-type-exports': 'error',
  '@typescript-eslint/no-restricted-imports': ['error', { paths: [], patterns: [] }],
  '@typescript-eslint/no-magic-numbers': [
    'error',
    { ignore: [0, 1, -1, Infinity], ignoreEnums: true, ignoreNumericLiteralTypes: true },
  ],
  '@typescript-eslint/prefer-readonly': 'error',
  '@typescript-eslint/require-array-sort-compare': 'error',
  '@typescript-eslint/member-ordering': [
    'error',
    {
      default: [
        'signature',
        'public-static-field',
        'private-static-field',
        'public-instance-field',
        'private-instance-field',
        'public-constructor',
        'private-constructor',
        'public-instance-method',
        'private-instance-method',
        'private-static-method',
        'public-static-method',
      ],
    },
  ],
  '@typescript-eslint/naming-convention': [
    'error',
    { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow', trailingUnderscore: 'allow' },
    { selector: 'variable', format: ['camelCase', 'UPPER_CASE'], leadingUnderscore: 'allow', trailingUnderscore: 'allow' },
    { selector: 'typeLike', format: ['PascalCase'] },
    { selector: 'enumMember', format: ['PascalCase', 'UPPER_CASE'] },
    { selector: 'function', format: ['camelCase'] },
    { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
    { selector: 'property', format: ['camelCase', 'PascalCase', 'UPPER_CASE'], leadingUnderscore: 'allow' },
    { selector: 'method', format: ['camelCase'] },
  ],
};

// Base language options for plain JS
const JS_BASE = {
  languageOptions: {
    ecmaVersion: 'latest',
    globals: NODE_GLOBALS,
  },
  rules: STYLE_RULES,
};

// Configuration (flat) with ordered layering
export default defineConfig([
  // Ignores: keep the linter away from generated or third-party content
  {
    ignores: ['dist/**', 'node_modules/**', '.vscode/**', 'eslint.config.mjs'],
  },

  // Plugins: register before using presets or plugin-specific rules
  {
    plugins: {
      eslint: js,
      '@typescript-eslint': tsPlugin,
      unicorn,
      n: nodePlugin,
    },
  },

  // Base JS preset: baseline from @eslint/js across the whole repo
  js.configs.recommended,

  // JS (CJS): classic Node sources; disable core no-unused-vars here
  // TS handles unused analysis in the typed TS blocks
  {
    files: JS_FILES,
    ...JS_BASE,
    languageOptions: {
      ...JS_BASE.languageOptions,
      sourceType: 'commonjs',
    },
    rules: {
      ...JS_BASE.rules,
      'no-unused-vars': 'off',
    },
  },

  // MJS (ESM): same baseline, but explicit ESM source type
  {
    files: MJS_FILES,
    ...JS_BASE,
    languageOptions: {
      ...JS_BASE.languageOptions,
      sourceType: 'module',
    },
  },

  // TypeScript (typed) for src/**
  // Typed rules require parserOptions.project; scoping to src/** ensures correct project mapping and faster lint runs
  ...tsPlugin.configs['flat/recommended-type-checked'].map((cfg) => ({
    ...cfg,
    files: TS_SRC_FILES,
    languageOptions: {
      ...cfg.languageOptions,
      parser: tsParser,
      parserOptions: {
        ...(cfg.languageOptions?.parserOptions),
        project: './tsconfig.json',
      },
      globals: {
        ...NODE_GLOBALS,
        ...(cfg.languageOptions?.globals),
      },
    },
    rules: {
      ...cfg.rules,
      ...STYLE_RULES,
      ...TS_SPECIFIC_RULES,
    },
  })),

  // Allow console usage in the logger configuration file only (for rare cases like announcing path)
  {
    files: LOGGER_FILE,
    rules: {
      'no-console': 'off',
    },
  },

  // Tests/Tools: ergonomic defaults (console allowed, certain strict TS rules relaxed)
  {
    files: TEST_AND_TOOL_FILES,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: NODE_GLOBALS,
    },
    rules: {
      'no-restricted-properties': 'off',
      'max-lines-per-function': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'no-underscore-dangle': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
]);
