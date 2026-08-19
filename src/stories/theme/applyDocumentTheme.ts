import { THEME_ATTRIBUTE, type ResolvedTheme } from './resolvePreviewTheme.ts'

const DOC_TARGETS = ['html', 'body', '#storybook-root', '.sb-show-main', '.sbdocs-wrapper'] as const

export function applyDocumentTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  root.setAttribute(THEME_ATTRIBUTE, theme)
  root.style.colorScheme = theme
  document.body?.setAttribute(THEME_ATTRIBUTE, theme)

  for (const selector of DOC_TARGETS) {
    document.querySelector(selector)?.setAttribute(THEME_ATTRIBUTE, theme)
  }
}
