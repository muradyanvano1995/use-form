import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoginForm } from '../examples/LoginForm.tsx'
import { UsernameAvailabilityForm } from '../examples/UsernameAvailabilityForm.tsx'

const meta = {
  title: 'Examples/Validation',
  component: LoginForm,
} satisfies Meta<typeof LoginForm>

export default meta
type Story = StoryObj<typeof meta>

export const SubmitMode: Story = {}

export const CustomAndAsyncRules: StoryObj<typeof UsernameAvailabilityForm> = {
  render: () => <UsernameAvailabilityForm />,
}
