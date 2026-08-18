import type { Meta, StoryObj } from '@storybook/react-vite'
import { OrderItemsForm } from '../examples/OrderItemsForm.tsx'

const meta = {
  title: 'Examples/Field arrays',
  component: OrderItemsForm,
} satisfies Meta<typeof OrderItemsForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
