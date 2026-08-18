import type { Meta, StoryObj } from '@storybook/react-vite'
import { WatchersForm } from '../../examples/WatchersForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'State and Performance/Subscriptions',
  component: WatchersForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'useFormState selectors isolate dirty flags. The useForm caller still re-renders; memoize children that subscribe.',
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
