import { createElement, useLayoutEffect, type CSSProperties, type ReactNode } from 'react'
import type { Decorator } from '@storybook/react-vite'
import { ResolvedTheme, THEME_ATTRIBUTE } from '../theme/resolvePreviewTheme.ts'
import { applyDocumentTheme } from '../theme/applyDocumentTheme.ts'

function ThemeRoot({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    // Dark mode disabled: keep Storybook/docs always on the light theme.
    applyDocumentTheme(ResolvedTheme.Light)
  }, [])

  const style: CSSProperties = {
    minHeight: '100%',
    background: 'var(--docs-bg-page)',
    color: 'var(--docs-text)',
    colorScheme: ResolvedTheme.Light,
  }

  return createElement(
    'div',
    {
      className: 'docs-preview-root',
      [THEME_ATTRIBUTE]: ResolvedTheme.Light,
      style,
    },
    children,
  )
}

export const withTheme: Decorator = (Story) => {
  return createElement(ThemeRoot, {
    children: createElement(Story),
  })
}
