export const ThemeMode = {
  Light: 'light',
  Dark: 'dark',
  System: 'system',
} as const

export type ThemeMode = (typeof ThemeMode)[keyof typeof ThemeMode]

export const ResolvedTheme = {
  Light: 'light',
  Dark: 'dark',
} as const

export type ResolvedTheme = (typeof ResolvedTheme)[keyof typeof ResolvedTheme]

export const THEME_ATTRIBUTE = 'data-theme'
export const THEME_GLOBAL = 'theme'

/** Story parameter for a canvas-only light/dark override. Never use globals.theme for this. */
export const PREVIEW_THEME_PARAM = 'previewTheme'

export function resolvePreviewTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (mode === ThemeMode.System) {
    return prefersDark ? ResolvedTheme.Dark : ResolvedTheme.Light
  }
  return mode
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === ThemeMode.Light || value === ThemeMode.Dark || value === ThemeMode.System
}
