import type { Meta, StoryObj } from '@storybook/react-vite'
import { RegistrationForm } from '../examples/RegistrationForm.tsx'

const meta = {
  title: 'Examples/Registration',
  component: RegistrationForm,
} satisfies Meta<typeof RegistrationForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
