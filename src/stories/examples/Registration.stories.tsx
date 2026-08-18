import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { RegistrationForm } from '../../examples/RegistrationForm.tsx'
import { disabledArgType } from '../preview/controls.ts'

const meta = {
  title: 'Examples/Registration',
  component: RegistrationForm,
  args: {
    disabled: false,
    onSubmitSuccess: fn(),
    onSubmitInvalid: fn(),
    onReset: fn(),
  },
  argTypes: {
    disabled: disabledArgType,
    onSubmitSuccess: {
      action: 'submitSuccess',
      description: 'Redacted payload. Passwords are never sent to Actions.',
    },
    onSubmitInvalid: { action: 'submitInvalid' },
    onReset: { action: 'reset' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'createRule name check, matchesField, accepted terms, exists@example.com server error (500ms), reset-after-success.',
      },
    },
  },
} satisfies Meta<typeof RegistrationForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Full name'), 'Ada Lovelace')
    await userEvent.type(canvas.getByLabelText('Email'), 'ada@example.com')
    await userEvent.type(canvas.getByLabelText('Password'), 'password1')
    await userEvent.type(canvas.getByLabelText('Confirm password'), 'password2')
    await userEvent.click(canvas.getByRole('checkbox', { name: 'I accept the terms of service' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }))
    await expect(canvas.getByText('Passwords must match')).toBeVisible()

    await userEvent.clear(canvas.getByLabelText('Confirm password'))
    await userEvent.type(canvas.getByLabelText('Confirm password'), 'password1')
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(args.onSubmitSuccess).toHaveBeenCalled())
  },
}
