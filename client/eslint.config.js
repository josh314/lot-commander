import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import stylistic from '@stylistic/eslint-plugin'
import pluginQuery from '@tanstack/eslint-plugin-query'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      ...pluginQuery.configs['flat/recommended-strict'],
    ],
    plugins: {
      '@stylistic': stylistic,
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {

      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "caughtErrors": "none",
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
        }
      ],

      '@stylistic/indent': ['warn', 2],
    }
  },
])
