import type { Meta, StoryObj } from '@storybook/react-vite'
import { UsernameAvailabilityForm } from '../examples/UsernameAvailabilityForm.tsx'

const meta = {
  title: 'Examples/Async validation',
  component: UsernameAvailabilityForm,
} satisfies Meta<typeof UsernameAvailabilityForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
