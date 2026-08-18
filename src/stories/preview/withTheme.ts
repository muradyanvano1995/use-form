import { createElement, useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { Decorator, StoryContext } from '@storybook/react-vite'
import { docsDarkTheme, docsLightTheme } from '../theme/managerThemes.ts'
import {
  isThemeMode,
  resolvePreviewTheme,
  THEME_ATTRIBUTE,
  ThemeMode,
  type ResolvedTheme,
} from '../theme/resolvePreviewTheme.ts'
import '../styles/tokens.css'
import '../styles/preview.css'
import '../../examples/examples.css'

function readPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyResolvedTheme(theme: ResolvedTheme): void {
  const root = document.documentElement
  root.setAttribute(THEME_ATTRIBUTE, theme)
  root.style.colorScheme = theme
  document.body?.setAttribute(THEME_ATTRIBUTE, theme)
}

function syncDocsTheme(context: StoryContext, theme: ResolvedTheme): void {
  context.parameters.docs = {
    ...context.parameters.docs,
    theme: theme === 'dark' ? docsDarkTheme : docsLightTheme,
  }
}

function ThemeRoot({
  mode,
  context,
  children,
}: {
  mode: ThemeMode
  context: StoryContext
  children: ReactNode
}) {
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolvePreviewTheme(mode, typeof window === 'undefined' ? false : readPrefersDark()),
  )

  useLayoutEffect(() => {
    const applyFromPreference = () => {
      const next = resolvePreviewTheme(mode, readPrefersDark())
      setResolved(next)
      applyResolvedTheme(next)
      syncDocsTheme(context, next)
    }

    applyFromPreference()

    if (mode !== ThemeMode.System) {
      return undefined
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', applyFromPreference)
    return () => {
      media.removeEventListener('change', applyFromPreference)
    }
  }, [context, mode])

  const style: CSSProperties = {
    minHeight: '100%',
    background: 'var(--docs-bg-page)',
    color: 'var(--docs-text)',
    colorScheme: resolved,
  }

  return createElement(
    'div',
    {
      className: 'docs-preview-root',
      [THEME_ATTRIBUTE]: resolved,
      style,
    },
    children,
  )
}

export const withTheme: Decorator = (Story, context) => {
  const mode = isThemeMode(context.globals.theme) ? context.globals.theme : ThemeMode.Light

  return createElement(ThemeRoot, {
    mode,
    context,
    children: createElement(Story),
  })
}
