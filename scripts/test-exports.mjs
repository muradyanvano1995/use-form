import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  CORE_FORBIDDEN_EXPORTS,
  CORE_RUNTIME_EXPORTS,
  DEVTOOLS_RUNTIME_EXPORTS,
  RESOLVER_RUNTIME_EXPORTS,
  assert,
  distDir,
  packageJson,
  rootDir,
} from './package-utils.mjs'

function walkJs(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...walkJs(full))
    } else if (entry.endsWith('.js')) {
      files.push(full)
    }
  }
  return files
}

const exportsMap = packageJson.exports
assert(exportsMap['.'], 'Missing core export')
assert(exportsMap['./devtools'], 'Missing DevTools export')
assert(exportsMap['./resolvers/standard-schema'], 'Missing resolver export')
assert(exportsMap['./package.json'], 'Missing package.json export')
assert(!exportsMap['./src'], 'Source path must not be exported')
assert(!exportsMap['./*'], 'Wildcard exports must not expose internals')

const core = await import(pathToFileURL(path.join(distDir, 'lib/index.js')).href)
const coreNames = Object.keys(core).sort()
for (const name of CORE_RUNTIME_EXPORTS) {
  assert(coreNames.includes(name), `Documented runtime export missing from core: ${name}`)
}
for (const name of CORE_FORBIDDEN_EXPORTS) {
  assert(!coreNames.includes(name), `Internal/specialized export leaked from core: ${name}`)
}

const extra = coreNames.filter((name) => !CORE_RUNTIME_EXPORTS.includes(name))
assert(extra.length === 0, `Unexpected core runtime exports: ${extra.join(', ')}`)

const devtools = await import(pathToFileURL(path.join(distDir, 'devtools/index.js')).href)
for (const name of DEVTOOLS_RUNTIME_EXPORTS) {
  assert(name in devtools, `DevTools missing ${name}`)
}

const resolver = await import(
  pathToFileURL(path.join(distDir, 'resolvers/standard-schema/index.js')).href
)
for (const name of RESOLVER_RUNTIME_EXPORTS) {
  assert(name in resolver, `Resolver missing ${name}`)
}

const coreFiles = walkJs(path.join(distDir, 'lib')).concat(
  walkJs(path.join(distDir, 'hooks')).filter(
    (file) => !file.includes(`${path.sep}devtools${path.sep}`),
  ),
)
const coreSource = coreFiles.map((file) => readFileSync(file, 'utf8')).join('\n')
assert(!coreSource.includes('FormDevTools'), 'Core graph contains FormDevTools')
assert(!coreSource.includes('storybook'), 'Core graph contains Storybook')
assert(!/from ['"]zod['"]/.test(coreSource), 'Core graph imports zod')
assert(!/from ['"]yup['"]/.test(coreSource), 'Core graph imports yup')
assert(!/from ['"]valibot['"]/.test(coreSource), 'Core graph imports valibot')

const libIndex = readFileSync(path.join(distDir, 'lib/index.js'), 'utf8')
assert(
  libIndex.startsWith("'use client'") || libIndex.startsWith('"use client"'),
  'Core entry is missing the use client directive',
)
const resolverIndex = readFileSync(path.join(distDir, 'resolvers/standard-schema/index.js'), 'utf8')
assert(
  !resolverIndex.startsWith("'use client'") && !resolverIndex.startsWith('"use client"'),
  'Resolver entry must remain server-compatible',
)

const dtsCore = path.join(rootDir, packageJson.exports['.'].types.replace('./', ''))
const dtsDevtools = path.join(rootDir, packageJson.exports['./devtools'].types.replace('./', ''))
const dtsResolver = path.join(
  rootDir,
  packageJson.exports['./resolvers/standard-schema'].types.replace('./', ''),
)
assert(
  readFileSync(dtsCore, 'utf8').includes('useForm'),
  'Core declarations do not mention useForm',
)
assert(!readFileSync(dtsCore, 'utf8').includes(".ts'"), 'Core declarations still import .ts paths')
assert(
  readFileSync(dtsDevtools, 'utf8').includes('FormDevTools'),
  'DevTools declarations missing FormDevTools',
)
assert(
  readFileSync(dtsResolver, 'utf8').includes('standardSchemaResolver'),
  'Resolver declarations missing standardSchemaResolver',
)

console.log('export map and built-file checks passed')
