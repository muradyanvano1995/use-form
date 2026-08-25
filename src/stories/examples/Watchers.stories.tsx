import type { Meta, StoryObj } from '@storybook/react-vite'
import { WatchersForm } from '../../examples/WatchersForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Examples/Watchers',
  component: WatchersForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'useWatch for values and useFormState for flags. Child isolation without prop drilling.',
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

export const Default: Story = {}
