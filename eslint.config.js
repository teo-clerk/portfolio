import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `.vite` is Vite's generated dependency pre-bundle and `legacy` is the
  // archived pre-React build — linting either produced hundreds of errors in
  // third-party output and drowned out real findings in src/.
  globalIgnores(['dist', '.vite', 'legacy', 'node_modules']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // Serverless functions run on Node, not in the browser.
    files: ['api/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // Content files are large template literals of ASCII art. Backslash-heavy
    // art trips no-useless-escape constantly and the escapes are harmless.
    files: ['src/data/**/*.js'],
    rules: {
      'no-useless-escape': 'off',
    },
  },
])
