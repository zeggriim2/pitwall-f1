import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    server: 'src/main/server.ts',
    worker: 'src/main/worker.ts',
    migrate: 'src/main/migrate.ts',
    sync: 'src/main/sync.ts',
  },
  format: 'esm',
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  clean: true,
  // Inline the workspace contracts package; keep real npm deps external.
  noExternal: ['@pitwall/contracts'],
})
