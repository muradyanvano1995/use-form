import type { Meta, StoryObj } from '@storybook/react-vite'
import { OrderItemsForm } from '../../examples/OrderItemsForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Examples/Field arrays',
  component: OrderItemsForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'useFieldArray append, insert, remove, move, swap, update, clear. minItems on the array. Optional file per row.',
          'OrderItemsForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.fieldArrays),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof OrderItemsForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
