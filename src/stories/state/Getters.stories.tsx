import type { Meta, StoryObj } from '@storybook/react-vite'
import { BatchedAddressForm } from '../../examples/BatchedAddressForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'State and Performance/Imperative getters',
  component: BatchedAddressForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'getValues, getValue, getErrors, getErrorDetails, getFieldState, getDirtyValues, getTouchedValues do not subscribe. The preview JSON is getDirtyValues() after a batch.',
          'BatchedAddressForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.getters),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof BatchedAddressForm>

export default meta
type Story = StoryObj<typeof meta>

export const DirtySnapshot: Story = {}
