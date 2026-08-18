import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-app',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-app/**',
      '**/package-tests/**',
      '**/storybook-static/**',
      '**/api-docs/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/hooks/useForm/**/*.{ts,tsx}'],
      exclude: [
        'src/**/index.ts',
        'src/**/*.type-test.ts',
        'src/**/*.type-tests.ts',
        'src/hooks/useForm/pathTypes.ts',
        'src/**/*.types.ts',
        // Type-only / re-export modules (no runtime statements for v8 to count)
        'src/hooks/useForm/baseTypes.ts',
        'src/hooks/useForm/formTypes.ts',
        'src/hooks/useForm/types.ts',
        'src/test/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
      ],
      thresholds: {
        statements: 90,
        branches: 75,
        functions: 90,
        lines: 90,
      },
    },
  },
})
