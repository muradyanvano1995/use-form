import type { Preview } from '@storybook/react-vite'
import { docsLightTheme } from '../src/stories/theme/managerThemes.ts'
import { THEME_GLOBAL, ThemeMode } from '../src/stories/theme/resolvePreviewTheme.ts'
import { docsViewports } from '../src/stories/preview/viewports.ts'
import { withTheme } from '../src/stories/preview/withTheme.ts'

const preview: Preview = {
  tags: ['autodocs'],
  decorators: [withTheme],
  globalTypes: {
    [THEME_GLOBAL]: {
      description: 'Preview and example theme. Owns the canvas background.',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: ThemeMode.Light, title: 'Light', icon: 'sun' },
          { value: ThemeMode.Dark, title: 'Dark', icon: 'moon' },
          { value: ThemeMode.System, title: 'System', icon: 'browser' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    [THEME_GLOBAL]: ThemeMode.Light,
  },
  parameters: {
    layout: 'padded',
    controls: {
      expanded: true,
      sort: 'requiredFirst',
    },
    actions: {
      disable: false,
    },
    backgrounds: {
      disable: true,
      options: {},
    },
    viewport: {
      options: docsViewports,
    },
    docs: {
      theme: docsLightTheme,
      toc: true,
      canvas: {
        sourceState: 'shown',
      },
      source: {
        excludeDecorators: true,
      },
    },
    a11y: {
      test: 'error',
    },
    options: {
      storySort: {
        order: [
          'Introduction',
          'Getting Started',
          'Core Concepts',
          ['Form state', 'Registration', 'Validation modes', 'Errors', 'Submission', 'Reset'],
          'Validation',
          [
            'Built-in rules',
            'Custom rules',
            'Form-level validation',
            'Async validation',
            'Async defaults',
            'Dependencies',
            'Structured errors',
            'Internationalization',
            'Schema resolvers',
          ],
          'Fields',
          [
            'Nested fields',
            'Controlled fields',
            'Conditional fields',
            'Field arrays',
            'File inputs',
            'Radio and checkbox groups',
          ],
          'State and Performance',
          ['Context', 'Subscriptions', 'Watchers', 'Batching', 'Imperative getters'],
          'Tools',
          ['DevTools'],
          'Examples',
          ['Login', 'Registration', 'Checkout', 'Mobile'],
          'Accessibility',
          'API overview',
          'Limitations and roadmap',
          'Theme',
        ],
      },
    },
  },
}

export default preview
