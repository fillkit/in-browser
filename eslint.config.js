/**
 * ESLint configuration for FillKit browser extensions
 * Covers shared/, chrome/, and firefox/ directories
 */

import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        chrome: 'readonly',
        browser: 'readonly',
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-undef': 'error',
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/web-ext-artifacts/**',
      '**/scripts/**',
      '**/icons/generate-icons.cjs',
      '**/*.min.js',
    ],
  },
];
