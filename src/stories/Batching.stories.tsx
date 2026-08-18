import type { Meta, StoryObj } from '@storybook/react-vite'
import { BatchedAddressForm } from '../examples/BatchedAddressForm.tsx'

const meta = {
  title: 'Examples/Batching and getters',
  component: BatchedAddressForm,
} satisfies Meta<typeof BatchedAddressForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
