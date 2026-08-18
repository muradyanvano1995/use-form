import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProfileForm } from '../examples/ProfileForm.tsx'

const meta = {
  title: 'Examples/Nested fields',
  component: ProfileForm,
} satisfies Meta<typeof ProfileForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
