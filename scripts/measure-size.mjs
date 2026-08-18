import { build } from 'vite'
import { gzipSync } from 'node:zlib'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { assert, distDir, rootDir } from './package-utils.mjs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const budget = require('./size-budget.json')

function formatBytes(value) {
  return `${value} B`
}

async function bundleFixture(
  label,
  source,
  externals = ['react', 'react-dom', 'react/jsx-runtime'],
) {
  const tmp = mkdtempSync(path.join(os.tmpdir(), `form-size-${label}-`))
  try {
    const entry = path.join(tmp, 'entry.js')
    writeFileSync(entry, source)
    const outDir = path.join(tmp, 'out')
    mkdirSync(outDir)
    await build({
      configFile: false,
      root: tmp,
      logLevel: 'silent',
      build: {
        outDir,
        emptyOutDir: true,
        minify: true,
        sourcemap: false,
        write: true,
        lib: {
          entry,
          formats: ['es'],
          fileName: () => 'bundle.js',
        },
        rollupOptions: {
          external: externals,
        },
      },
    })
    const file = path.join(outDir, 'bundle.js')
    const raw = readFileSync(file)
    const gzip = gzipSync(raw).length
    return { raw: raw.length, gzip, code: raw.toString('utf8') }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

const coreEntry = pathToFileURL(path.join(distDir, 'lib/index.js')).href
const devtoolsEntry = pathToFileURL(path.join(distDir, 'devtools/index.js')).href
const resolverEntry = pathToFileURL(path.join(distDir, 'resolvers/standard-schema/index.js')).href

const rulesOnly = await bundleFixture(
  'rules',
  `import { rules } from ${JSON.stringify(coreEntry)}\nexport { rules }\n`,
)
const useFormOnly = await bundleFixture(
  'useForm',
  `import { useForm } from ${JSON.stringify(coreEntry)}\nexport { useForm }\n`,
)
const coreAll = await bundleFixture('core', `export * from ${JSON.stringify(coreEntry)}\n`)
const devtools = await bundleFixture(
  'devtools',
  `import { FormDevTools } from ${JSON.stringify(devtoolsEntry)}\nexport { FormDevTools }\n`,
)
const resolver = await bundleFixture(
  'resolver',
  `import { standardSchemaResolver } from ${JSON.stringify(resolverEntry)}\nexport { standardSchemaResolver }\n`,
  [],
)

function deny(code, pattern, label) {
  assert(!pattern.test(code), `${label} unexpectedly matched ${pattern}`)
}

deny(rulesOnly.code, /FormDevTools/, 'rules-only bundle contains DevTools')
deny(rulesOnly.code, /function App/, 'rules-only bundle contains the demo app')
deny(rulesOnly.code, /from ['"]zod['"]/, 'rules-only bundle contains zod')
deny(useFormOnly.code, /FormDevTools/, 'useForm bundle contains DevTools')
deny(useFormOnly.code, /storybook/, 'useForm bundle contains Storybook')
deny(resolver.code, /from ['"]react['"]/, 'resolver bundle imports React')
assert(
  !coreAll.code.includes('react-dom'),
  'Core consumer bundle should leave react-dom external or unused',
)

const measurements = {
  'core.min.js': coreAll.raw,
  'core.min.js.gz': coreAll.gzip,
  'devtools.min.js': devtools.raw,
  'devtools.min.js.gz': devtools.gzip,
  'resolver.min.js': resolver.raw,
  'resolver.min.js.gz': resolver.gzip,
  'rules-only.min.js': rulesOnly.raw,
  'useForm-only.min.js': useFormOnly.raw,
}

console.log('Bundle sizes (minified consumer builds, React external for UI entries):')
for (const [name, value] of Object.entries(measurements)) {
  console.log(`  ${name}: ${formatBytes(value)}`)
}

for (const [name, max] of Object.entries(budget)) {
  const actual = measurements[name]
  assert(typeof actual === 'number', `Missing measurement for ${name}`)
  assert(actual <= max, `${name} is ${actual} B, over budget ${max} B`)
}

void rootDir
console.log('size budgets passed')
