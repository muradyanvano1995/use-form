export const ResolvedTheme = {
  Light: 'light',
} as const

export type ResolvedTheme = (typeof ResolvedTheme)[keyof typeof ResolvedTheme]

export const THEME_ATTRIBUTE = 'data-theme'
