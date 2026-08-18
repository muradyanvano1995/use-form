import type { Meta, StoryObj } from '@storybook/react-vite'
import { OrderItemsForm } from '../../examples/OrderItemsForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Validation/Form-level validation',
  component: OrderItemsForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'The validate option runs after field rules and can override same-path messages. This order form checks each product name and quantity in one function, plus rules.minItems on the array.',
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

export const FormLevel: Story = {}
