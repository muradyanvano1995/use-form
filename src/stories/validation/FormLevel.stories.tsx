import type { Meta, StoryObj } from '@storybook/react-vite'
import { OrderItemsForm } from '../../examples/OrderItemsForm.tsx'

const meta = {
  title: 'Validation/Form-level validation',
  component: OrderItemsForm,
  parameters: {
    docs: {
      description: {
        component:
          'The validate option runs after field rules and can override same-path messages. This order form checks each product name and quantity in one function, plus rules.minItems on the array.',
      },
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof OrderItemsForm>

export default meta
type Story = StoryObj<typeof meta>

export const FormLevel: Story = {}
