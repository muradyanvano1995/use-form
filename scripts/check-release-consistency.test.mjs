import assert from 'node:assert/strict'
import test from 'node:test'
import {
  findStalePhrases,
  stableChangelogEntryExists,
  validateDiscoveryMetadata,
} from './check-release-consistency.mjs'

const validDiscovery = {
  description: 'A strongly typed, headless React form-state and validation library.',
  keywords: [
    'react',
    'react-hooks',
    'typescript',
    'form',
    'forms',
    'form-state',
    'form-validation',
    'validation',
    'field-array',
    'async-validation',
    'schema-validation',
    'headless',
    'accessibility',
    'ssr',
  ],
}

test('findStalePhrases detects active stale wording', () => {
  const hits = findStalePhrases('Install from npm only after publication.')
  assert.equal(hits.length, 1)
  assert.equal(hits[0]?.label, 'Install from npm only after')
})

test('findStalePhrases detects undeployed Storybook wording', () => {
  const hits = findStalePhrases('Storybook docs are local only (not deployed).')
  assert.ok(hits.some((hit) => hit.label === 'Storybook docs are local only'))
  assert.ok(hits.some((hit) => hit.label === 'not deployed'))
})

test('findStalePhrases ignores clean consumer copy', () => {
  const hits = findStalePhrases(
    'npm install @muradyanvano/use-form — docs at https://muradyanvano1995.github.io/use-form/',
  )
  assert.equal(hits.length, 0)
})

test('stableChangelogEntryExists matches version headings', () => {
  const changelog = '# Changelog\n\n## [0.1.2] - 2026-08-29\n\nMetadata patch.\n'
  assert.equal(stableChangelogEntryExists(changelog, '0.1.2'), true)
  assert.equal(stableChangelogEntryExists(changelog, '0.1.1'), false)
})

test('validateDiscoveryMetadata accepts valid description and keywords', () => {
  assert.deepEqual(validateDiscoveryMetadata(validDiscovery), [])
})

test('validateDiscoveryMetadata rejects missing description', () => {
  const failures = validateDiscoveryMetadata({ keywords: validDiscovery.keywords })
  assert.ok(failures.some((message) => /description must be a non-empty string/.test(message)))
})

test('validateDiscoveryMetadata rejects empty keyword array', () => {
  const failures = validateDiscoveryMetadata({
    description: validDiscovery.description,
    keywords: [],
  })
  assert.ok(failures.some((message) => /non-empty array/.test(message)))
})

test('validateDiscoveryMetadata rejects duplicate keywords', () => {
  const failures = validateDiscoveryMetadata({
    description: validDiscovery.description,
    keywords: [...validDiscovery.keywords, 'react'],
  })
  assert.ok(failures.some((message) => /duplicates/.test(message)))
})

test('validateDiscoveryMetadata rejects uppercase keywords', () => {
  const failures = validateDiscoveryMetadata({
    description: validDiscovery.description,
    keywords: validDiscovery.keywords.map((keyword) => (keyword === 'react' ? 'React' : keyword)),
  })
  assert.ok(failures.some((message) => /lowercase/.test(message)))
})

test('validateDiscoveryMetadata rejects missing required keyword', () => {
  const failures = validateDiscoveryMetadata({
    description: validDiscovery.description,
    keywords: validDiscovery.keywords.filter((keyword) => keyword !== 'typescript'),
  })
  assert.ok(failures.some((message) => /typescript/.test(message)))
})

test('validateDiscoveryMetadata rejects non-string keyword', () => {
  const failures = validateDiscoveryMetadata({
    description: validDiscovery.description,
    keywords: [...validDiscovery.keywords.slice(0, 3), 42, ...validDiscovery.keywords.slice(3)],
  })
  assert.ok(failures.some((message) => /non-empty string/.test(message)))
})
