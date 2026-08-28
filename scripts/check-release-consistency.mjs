import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CORE_FORBIDDEN_EXPORTS,
  CORE_RUNTIME_EXPORTS,
  DEVTOOLS_RUNTIME_EXPORTS,
  PACKAGE_NAME,
  RESOLVER_RUNTIME_EXPORTS,
  assert,
  packageJson,
  rootDir,
} from './package-utils.mjs'

const EXPECTED = {
  name: PACKAGE_NAME,
  license: 'MIT',
  authorName: 'Vano Muradyan',
  repositoryUrl: 'git+https://github.com/muradyanvano1995/use-form.git',
  homepage: 'https://github.com/muradyanvano1995/use-form#readme',
  bugsUrl: 'https://github.com/muradyanvano1995/use-form/issues',
  files: ['dist', 'README.md', 'CHANGELOG.md', 'LICENSE'],
  exportSubpaths: ['.', './devtools', './resolvers/standard-schema', './package.json'],
}

const STALE_PATTERNS = [
  { label: '<package-name>', regex: /<package-name>/i },
  { label: 'Planned npm name', regex: /Planned npm name/i },
  { label: 'Not published yet', regex: /Not published yet/i },
  { label: 'private: true remains', regex: /private:\s*true\s+remains/i },
  {
    label: 'Install from npm only after',
    regex: /Install from npm only after/i,
  },
]

/** @type {string[]} */
export const ACTIVE_DOC_PATHS = [
  'README.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'docs/releasing.md',
  'docs/public-api.md',
  'docs/migration.md',
  'docs/package-roadmap.md',
  'docs/ci.md',
  'docs/storybook.md',
  'src/stories/documentation/Introduction.stories.tsx',
  'src/stories/documentation/GettingStarted.stories.tsx',
  'src/stories/documentation/Limitations.stories.tsx',
  'src/stories/documentation/ApiOverview.stories.tsx',
  'src/stories/snippets/consumerSnippets.ts',
]

/** Audit/historical docs — stale phrases may remain intentionally. */
const EXCLUDED_DOC_PATHS = new Set([
  'docs/package-identity-migration.md',
  'docs/production-readiness-audit.md',
  'docs/stable-release-audit.md',
  'CHANGELOG.md',
])

export function readLockfileRoot() {
  const lockfilePath = path.join(rootDir, 'package-lock.json')
  const lockfile = JSON.parse(readFileSync(lockfilePath, 'utf8'))
  const packages = lockfile.packages?.[''] ?? {}
  return {
    name: packages.name ?? lockfile.name,
    version: packages.version ?? lockfile.version,
  }
}

export function findStalePhrases(content, patterns = STALE_PATTERNS) {
  /** @type {{ label: string, index: number, line: number, excerpt: string }[]} */
  const hits = []
  for (const pattern of patterns) {
    const match = pattern.regex.exec(content)
    if (match) {
      const index = match.index
      const line = content.slice(0, index).split('\n').length
      const lineStart = content.lastIndexOf('\n', index) + 1
      const lineEnd = content.indexOf('\n', index)
      const excerpt = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim()
      hits.push({ label: pattern.label, index, line, excerpt })
    }
  }
  return hits
}

export function stableChangelogEntryExists(changelog, version) {
  const escaped = version.replace(/\./g, '\\.')
  return new RegExp(`^## \\[${escaped}\\]`, 'm').test(changelog)
}

function verifyPackageIdentity() {
  assert(packageJson.name === EXPECTED.name, `package.json name must be ${EXPECTED.name}`)
  assert(packageJson.private === false, 'package.json private must be false')
  assert(
    packageJson.license === EXPECTED.license,
    `package.json license must be ${EXPECTED.license}`,
  )
  assert(
    packageJson.author?.name === EXPECTED.authorName,
    `package.json author.name must be ${EXPECTED.authorName}`,
  )
  assert(
    packageJson.repository?.url === EXPECTED.repositoryUrl,
    `package.json repository.url must be ${EXPECTED.repositoryUrl}`,
  )
  assert(
    packageJson.homepage === EXPECTED.homepage,
    `package.json homepage must be ${EXPECTED.homepage}`,
  )
  assert(
    packageJson.bugs?.url === EXPECTED.bugsUrl,
    `package.json bugs.url must be ${EXPECTED.bugsUrl}`,
  )

  const lockRoot = readLockfileRoot()
  assert(lockRoot.name === packageJson.name, 'package-lock root name must match package.json name')
  assert(
    lockRoot.version === packageJson.version,
    `package-lock root version (${lockRoot.version}) must match package.json version (${packageJson.version})`,
  )

  if (packageJson.publishConfig?.tag) {
    throw new Error(
      'package.json publishConfig.tag must not be hardcoded; the publish workflow selects the dist-tag',
    )
  }
  assert(
    packageJson.publishConfig?.access === 'public',
    'package.json publishConfig.access must be "public"',
  )
}

function verifyExportsAndFiles() {
  const exportKeys = Object.keys(packageJson.exports ?? {}).sort()
  const expectedKeys = [...EXPECTED.exportSubpaths].sort()
  assert(
    exportKeys.join('\0') === expectedKeys.join('\0'),
    `package.json exports must be exactly: ${expectedKeys.join(', ')}`,
  )

  const files = [...(packageJson.files ?? [])].sort()
  const expectedFiles = [...EXPECTED.files].sort()
  assert(
    files.join('\0') === expectedFiles.join('\0'),
    `package.json files must be exactly: ${expectedFiles.join(', ')}`,
  )
}

function verifyBuiltExports() {
  const corePath = path.join(rootDir, 'dist/lib/index.js')
  const devtoolsPath = path.join(rootDir, 'dist/devtools/index.js')
  const resolverPath = path.join(rootDir, 'dist/resolvers/standard-schema/index.js')
  for (const filePath of [corePath, devtoolsPath, resolverPath]) {
    assert(
      statSync(filePath).isFile(),
      `Missing built export file: ${path.relative(rootDir, filePath)}`,
    )
  }

  const coreSource = readFileSync(corePath, 'utf8')
  for (const symbol of CORE_RUNTIME_EXPORTS) {
    assert(coreSource.includes(symbol), `Core bundle must export ${symbol}`)
  }
  for (const symbol of CORE_FORBIDDEN_EXPORTS) {
    assert(!coreSource.includes(`export { ${symbol}`), `Core bundle must not export ${symbol}`)
  }

  const devtoolsSource = readFileSync(devtoolsPath, 'utf8')
  for (const symbol of DEVTOOLS_RUNTIME_EXPORTS) {
    assert(devtoolsSource.includes(symbol), `DevTools bundle must export ${symbol}`)
  }

  const resolverSource = readFileSync(resolverPath, 'utf8')
  for (const symbol of RESOLVER_RUNTIME_EXPORTS) {
    assert(resolverSource.includes(symbol), `Resolver bundle must export ${symbol}`)
  }
  assert(!resolverSource.includes('from "react"'), 'Resolver bundle must not import React')
}

function verifyActiveDocumentation() {
  const failures = []
  for (const relativePath of ACTIVE_DOC_PATHS) {
    if (EXCLUDED_DOC_PATHS.has(relativePath)) continue
    const absolutePath = path.join(rootDir, relativePath)
    const content = readFileSync(absolutePath, 'utf8')
    const hits = findStalePhrases(content)
    for (const hit of hits) {
      failures.push(
        `${relativePath}:${hit.line} contains stale phrase "${hit.label}" — ${hit.excerpt}`,
      )
    }
  }

  const readme = readFileSync(path.join(rootDir, 'README.md'), 'utf8')
  if (!readme.includes(PACKAGE_NAME)) {
    failures.push(`README.md must mention the real package name ${PACKAGE_NAME}`)
  }

  if (failures.length > 0) {
    throw new Error(
      `Active documentation stale phrases:\n${failures.map((f) => `- ${f}`).join('\n')}`,
    )
  }
}

function verifyChangelog() {
  const changelog = readFileSync(path.join(rootDir, 'CHANGELOG.md'), 'utf8')
  assert(
    stableChangelogEntryExists(changelog, packageJson.version),
    `CHANGELOG.md must contain a ## [${packageJson.version}] section for the stable preparation entry`,
  )
}

function main() {
  verifyPackageIdentity()
  verifyExportsAndFiles()

  const distExists = statSync(path.join(rootDir, 'dist'), { throwIfNoEntry: false })?.isDirectory()
  if (distExists) {
    verifyBuiltExports()
  } else {
    console.warn(
      'release:check skipped built export verification (dist/ not found; run build:lib first)',
    )
  }

  verifyActiveDocumentation()
  verifyChangelog()
  console.log(`release:check OK (${PACKAGE_NAME}@${packageJson.version})`)
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (isMain) {
  main()
}
