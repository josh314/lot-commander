import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(import.meta.dirname, '../shared/src'),
    },
  },
  test: {
    env: {
      MONGOMS_VERSION: '7.0.26', // mongodb-memory-server should match prod's actual Mongo version for tests
    },
  },
})