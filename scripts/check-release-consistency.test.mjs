import assert from 'node:assert/strict'
import test from 'node:test'
import { findStalePhrases, stableChangelogEntryExists } from './check-release-consistency.mjs'

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
  const changelog = '# Changelog\n\n## [0.1.1] - 2026-08-29\n\nMetadata patch.\n'
  assert.equal(stableChangelogEntryExists(changelog, '0.1.1'), true)
  assert.equal(stableChangelogEntryExists(changelog, '0.1.0'), false)
})
