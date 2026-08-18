import { describe, expect, it } from 'vitest'
import { resolvePreviewTheme, ThemeMode } from './resolvePreviewTheme.ts'

describe('resolvePreviewTheme', () => {
  it('returns light and dark modes unchanged', () => {
    expect(resolvePreviewTheme(ThemeMode.Light, true)).toBe('light')
    expect(resolvePreviewTheme(ThemeMode.Dark, false)).toBe('dark')
  })

  it('follows the operating-system preference in system mode', () => {
    expect(resolvePreviewTheme(ThemeMode.System, true)).toBe('dark')
    expect(resolvePreviewTheme(ThemeMode.System, false)).toBe('light')
  })
})
