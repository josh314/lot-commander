import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

import stylistic from '@stylistic/eslint-plugin'

const stylisticRules = {
  '@stylistic/indent': ['warn', 2],
}

const sharedRules = {
  "no-unused-vars": [
    "warn",
    {
      "caughtErrors": "none",
      varsIgnorePattern: "^_",
      argsIgnorePattern: "^_",
    }
  ],
}
const tsifiedSharedRules = Object.fromEntries(
  Object.entries(sharedRules).map(([key, value]) => [`@typescript-eslint/${key}`, value])
)

export default defineConfig([
  globalIgnores(['dist']),
  {
    rules: {
      ...stylisticRules,
    }
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [
      js.configs.recommended,
    ],
    plugins: {
      '@stylistic': stylistic,
    },
    languageOptions: {
      globals: globals.node,
    },
    rules: {

      ...sharedRules,

      "block-scoped-var": "error"

    }
  },
  {
    files: ['**/*.{ts,mts,cts}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
    ],
    plugins: {
      '@stylistic': stylistic,
    },
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {

      ...tsifiedSharedRules

    }
  },
])
