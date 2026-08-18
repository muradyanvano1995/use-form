import type { Meta, StoryObj } from '@storybook/react-vite'
import { WatchersForm } from '../../examples/WatchersForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'State and Performance/Watchers',
  component: WatchersForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'useWatch({ name: "title" }) from context. Distinct from useFormState: watchers read values, form-state selectors read flags/errors.',
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

export const UseWatch: Story = {}
