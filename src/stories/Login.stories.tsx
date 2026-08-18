import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoginForm } from '../examples/LoginForm.tsx'

const meta = {
  title: 'Examples/Login',
  component: LoginForm,
} satisfies Meta<typeof LoginForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
