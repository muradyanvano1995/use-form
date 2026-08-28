import type { Preview } from '@storybook/react-vite'
import { docsLightTheme } from '../src/stories/theme/managerThemes.ts'
import { docsViewports } from '../src/stories/preview/viewports.ts'
import { withTheme } from '../src/stories/preview/withTheme.ts'
import '../src/stories/styles/tokens.css'
import '../src/stories/styles/preview.css'
import '../src/stories/styles/syntax.css'
import '../src/examples/examples.css'

const preview: Preview = {
  tags: ['autodocs'],
  decorators: [withTheme],
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
          [
            'Registration',
            'Validation modes',
            'Errors',
            'Submission',
            'Reset',
            'Imperative getters',
            'Imperative mutations',
            'normalizeErrors',
          ],
          'Hooks',
          [
            'useForm',
            'useWatch',
            'useFormState',
            'useFieldState',
            'useController',
            'useFieldArray',
            'useFormContext',
            'FormProvider',
          ],
          'Fields',
          ['Nested fields', 'Conditional fields', 'File inputs', 'Radio and checkbox groups'],
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
          'State & Performance',
          ['Batching'],
          'DevTools',
          'Complete Examples',
          ['Login', 'Registration', 'Checkout', 'Async profile defaults', 'DevTools playground'],
          'Accessibility',
          'API Reference',
          'Migration',
          'Limitations and roadmap',
        ],
      },
    },
  },
}

export default preview
