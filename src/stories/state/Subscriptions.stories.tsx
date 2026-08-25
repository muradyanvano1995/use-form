import type { Meta, StoryObj } from '@storybook/react-vite'
import { WatchersForm } from '../../examples/WatchersForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Hooks/useFormState',
  component: WatchersForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'useFormState selectors isolate dirty flags and other store slices. Pair with useFieldState for a single field’s error/touched/dirty. The useForm caller still re-renders; memoize children that subscribe.',
          'WatchersForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.watchers),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof WatchersForm>

export default meta
type Story = StoryObj<typeof meta>

export const Selectors: Story = {}
