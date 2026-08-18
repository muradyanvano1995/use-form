import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { LoginForm } from '../../examples/LoginForm.tsx'

const meta = {
  title: 'Core Concepts/Errors',
  component: LoginForm,
  parameters: {
    docs: {
      description: {
        component:
          'Field errors from rules, backend mapping via helpers.setErrors, and submitError banners. Root errors (see Structured errors) are not focus targets. Trigger taken@example.com after filling a 6+ character password.',
      },
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof LoginForm>

export default meta
type Story = StoryObj<typeof meta>

export const BackendMapping: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Email'), 'taken@example.com')
    await userEvent.type(canvas.getByLabelText('Password'), 'secret1')
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(canvas.getByText('This email is already registered.')).toBeVisible())
  },
}
