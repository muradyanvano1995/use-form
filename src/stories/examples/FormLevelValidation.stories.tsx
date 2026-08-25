import type { Meta, StoryObj } from '@storybook/react-vite'
import { OrderItemsForm } from '../../examples/OrderItemsForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Examples/Form-level validation',
  component: OrderItemsForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'Form-level validate walks products and returns path-keyed FieldErrors. Complements field rules and minItems.',
          'OrderItemsForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.formLevel),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof OrderItemsForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
