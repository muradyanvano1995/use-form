import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { defineConfig, type Plugin } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))

function preserveClientDirective(): Plugin {
  return {
    name: 'preserve-use-client',
    renderChunk(code, chunk) {
      const fileName = chunk.fileName.replaceAll('\\', '/')
      const isClientEntry =
        fileName === 'lib/index.js' ||
        fileName === 'devtools/index.js' ||
        fileName.endsWith('/lib/index.js') ||
        fileName.endsWith('/devtools/index.js')
      if (!isClientEntry) return null
      if (code.startsWith("'use client'") || code.startsWith('"use client"')) return null
      return { code: `'use client'\n${code}`, map: null }
    },
  }
}

export default defineConfig({
  publicDir: false,
  plugins: [
    react(),
    dts({
      tsconfigPath: path.join(root, 'tsconfig.lib.json'),
      entryRoot: path.join(root, 'src'),
      include: [
        'src/lib/**/*.ts',
        'src/lib/**/*.tsx',
        'src/hooks/useForm/**/*.ts',
        'src/hooks/useForm/**/*.tsx',
        'src/devtools/**/*.ts',
        'src/devtools/**/*.tsx',
        'src/resolvers/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.type-test.ts',
        'src/examples/**',
        'src/stories/**',
        'src/App.tsx',
        'src/main.tsx',
        'src/test/**',
      ],
      beforeWriteFile(filePath, content) {
        return {
          filePath,
          content: content
            .replaceAll(/from ['"]([^'"]+)\.tsx?['"]/g, "from '$1.js'")
            .replaceAll(/import\(['"]([^'"]+)\.tsx?['"]\)/g, "import('$1.js')"),
        }
      },
    }),
    preserveClientDirective(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    target: 'es2022',
    copyPublicDir: false,
    lib: {
      entry: {
        'lib/index': path.join(root, 'src/lib/index.ts'),
        'devtools/index': path.join(root, 'src/devtools/index.ts'),
        'resolvers/standard-schema/index': path.join(
          root,
          'src/resolvers/standard-schema/index.ts',
        ),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [/^react(?:\/|$)/, /^react-dom(?:\/|$)/],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      },
    },
  },
})
