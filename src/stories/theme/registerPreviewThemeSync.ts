import { addons } from 'storybook/preview-api'
import { GLOBALS_UPDATED } from 'storybook/internal/core-events'
import { applyDocumentTheme } from './applyDocumentTheme.ts'
import {
  isThemeMode,
  resolvePreviewTheme,
  ThemeMode,
  type ThemeMode as ThemeModeValue,
} from './resolvePreviewTheme.ts'

function readToolbarThemeMode(value: unknown): ThemeModeValue {
  if (isThemeMode(value)) {
    return value
  }
  return ThemeMode.Light
}

function readPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

let toolbarMode: ThemeModeValue = ThemeMode.Light

function syncDocumentThemeFromToolbar(mode: ThemeModeValue): void {
  toolbarMode = mode
  applyDocumentTheme(resolvePreviewTheme(mode, readPrefersDark()))
}

function readThemeFromUrl(): ThemeModeValue {
  try {
    const params = new URLSearchParams(window.location.search)
    const globals = params.get('globals') ?? ''
    const match = /(?:^|;)theme:([^;]+)/.exec(globals)
    if (match) {
      return readToolbarThemeMode(decodeURIComponent(match[1]))
    }
  } catch {
    // Ignore malformed preview URLs.
  }
  return ThemeMode.Light
}

if (typeof window !== 'undefined') {
  syncDocumentThemeFromToolbar(readThemeFromUrl())

  const channel = addons.getChannel()
  channel.on(GLOBALS_UPDATED, ({ globals }: { globals?: { theme?: unknown } }) => {
    syncDocumentThemeFromToolbar(readToolbarThemeMode(globals?.theme))
  })

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (toolbarMode === ThemeMode.System) {
      syncDocumentThemeFromToolbar(ThemeMode.System)
    }
  })
}
