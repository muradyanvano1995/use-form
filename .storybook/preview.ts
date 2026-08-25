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
          'Hooks',
          [
            'useForm',
            'useWatch',
            'useFormState',
            'useFieldState',
            'useController',
            'useFieldArray',
            'useFormContext',
          ],
          'Components',
          ['FormProvider', 'FormDevTools'],
          'Core Concepts',
          [
            'Registration',
            'Validation modes',
            'Errors',
            'Submission',
            'Reset',
            'Batching',
            'Imperative getters',
          ],
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
          ['Nested fields', 'Conditional fields', 'File inputs', 'Radio and checkbox groups'],
          'Examples',
          [
            'Login',
            'Registration',
            'Checkout',
            'Built-in rules',
            'Form-level validation',
            'Async validation',
            'Async defaults',
            'Dependencies',
            'Structured errors',
            'Internationalization',
            'Schema resolvers',
            'Nested fields',
            'Conditional fields',
            'Controlled fields',
            'Field arrays',
            'File uploads',
            'Radio and checkboxes',
            'Form context',
            'Watchers',
            'Batching',
            'DevTools',
            'Mobile',
          ],
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
