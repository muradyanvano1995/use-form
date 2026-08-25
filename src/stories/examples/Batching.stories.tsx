import type { Meta, StoryObj } from '@storybook/react-vite'
import { BatchedAddressForm } from '../../examples/BatchedAddressForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Examples/Batching',
  component: BatchedAddressForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'form.batch() applies several setValue calls as one notification. Also shows imperative getDirtyValues().',
          'BatchedAddressForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.batching),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof BatchedAddressForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
