import { describe, expect, it } from 'vitest'
import { snippets } from './consumerSnippets.ts'

const banned = [
  'fn(',
  'storybook/test',
  '../hooks/',
  '../lib/',
  "from '../",
  'from "./',
  '@storybook',
  'vi.fn',
  'composeStories',
]

describe('consumer snippets', () => {
  it('uses public package imports and no Storybook or test APIs', () => {
    for (const [name, code] of Object.entries(snippets)) {
      for (const token of banned) {
        expect(code, `${name} contains ${token}`).not.toContain(token)
      }
      expect(code, `${name} should import <package-name>`).toContain('<package-name>')
      expect(code.length).toBeGreaterThan(80)
    }
  })
})
