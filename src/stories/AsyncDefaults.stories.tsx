import type { Meta, StoryObj } from '@storybook/react-vite'
import { AsyncDefaultsProfileForm } from '../examples/AsyncDefaultsProfileForm.tsx'

const meta = {
  title: 'Examples/Async defaults',
  component: AsyncDefaultsProfileForm,
} satisfies Meta<typeof AsyncDefaultsProfileForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
