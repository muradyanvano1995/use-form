import { describe, expect, it } from 'vitest'
import { applyDocumentTheme } from './applyDocumentTheme.ts'
import { THEME_ATTRIBUTE } from './resolvePreviewTheme.ts'

describe('applyDocumentTheme', () => {
  it('writes the resolved theme on the document and docs containers', () => {
    document.documentElement.innerHTML =
      '<body><div id="storybook-root"></div><div class="sbdocs-wrapper"></div></body>'

    applyDocumentTheme('light')
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('light')
    expect(document.body?.getAttribute(THEME_ATTRIBUTE)).toBe('light')
    expect(document.getElementById('storybook-root')?.getAttribute(THEME_ATTRIBUTE)).toBe('light')
    expect(document.querySelector('.sbdocs-wrapper')?.getAttribute(THEME_ATTRIBUTE)).toBe('light')

    applyDocumentTheme('dark')
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('dark')
    expect(document.body?.getAttribute(THEME_ATTRIBUTE)).toBe('dark')
  })
})
