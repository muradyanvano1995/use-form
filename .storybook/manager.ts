import { addons } from 'storybook/manager-api'
import { GLOBALS_UPDATED } from 'storybook/internal/core-events'
import { docsDarkTheme, docsLightTheme } from '../src/stories/theme/managerThemes.ts'
import {
  resolvePreviewTheme,
  ThemeMode,
  type ThemeMode as ThemeModeValue,
} from '../src/stories/theme/resolvePreviewTheme.ts'

function readThemeMode(value: unknown): ThemeModeValue {
  if (value === ThemeMode.Dark || value === ThemeMode.System || value === ThemeMode.Light) {
    return value
  }
  return ThemeMode.Light
}

function applyManagerTheme(mode: ThemeModeValue): void {
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolved = resolvePreviewTheme(mode, prefersDark)
  addons.setConfig({
    theme: resolved === 'dark' ? docsDarkTheme : docsLightTheme,
  })
}

addons.setConfig({
  theme: docsLightTheme,
})

addons.register('form-hooks/manager-theme', (api) => {
  const sync = (theme: unknown) => {
    applyManagerTheme(readThemeMode(theme))
  }

  sync(api.getGlobals().theme)

  api.on(GLOBALS_UPDATED, (payload?: { globals?: { theme?: unknown } }) => {
    sync(payload?.globals?.theme)
  })

  if (typeof window === 'undefined') return
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onSchemeChange = () => {
    if (readThemeMode(api.getGlobals().theme) === ThemeMode.System) {
      applyManagerTheme(ThemeMode.System)
    }
  }
  media.addEventListener('change', onSchemeChange)
})
