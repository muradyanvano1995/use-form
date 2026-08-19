import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { LoginForm } from '../../examples/LoginForm.tsx'
import { ValidationMode } from '../../lib/index.ts'
import { disabledArgType, modeArgType, reValidateModeArgType } from '../preview/controls.ts'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Examples/Login',
  component: LoginForm,
  args: {
    disabled: false,
    mode: ValidationMode.OnBlur,
    focusOnError: true,
    preventDuplicateSubmit: true,
    onSubmitSuccess: fn(),
    onSubmitInvalid: fn(),
    onReset: fn(),
  },
  argTypes: {
    disabled: disabledArgType,
    mode: modeArgType,
    reValidateMode: reValidateModeArgType,
    focusOnError: {
      control: 'boolean',
      description: 'Focus the first invalid field after a failed submit.',
    },
    preventDuplicateSubmit: {
      control: 'boolean',
      description: 'Ignore overlapping submit clicks while isSubmitting is true.',
    },
    onSubmitSuccess: {
      action: 'submitSuccess',
      description: 'Redacted success payload. Password is never included.',
    },
    onSubmitInvalid: { action: 'submitInvalid', description: 'Fired when field errors remain.' },
    onReset: { action: 'reset' },
  },
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'Minimal login with blur validation, remember-me, reset, and `taken@example.com` backend mapping (450ms). API: useForm, register, setErrors, submitError.',
          'LoginForm.tsx',
        ),
        story:
          'Submit empty for required errors, type not-an-email, then a valid pair. Password is redacted in Actions.',
      },
      source: consumerDocsSource(snippets.basicUseForm),
    },
  },
} satisfies Meta<typeof LoginForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const submit = canvas.getByRole('button', { name: 'Sign in' })
    await userEvent.click(submit)
    await expect(canvas.getByText('Email is required')).toBeVisible()
    await expect(canvas.getByLabelText('Email')).toHaveFocus()
    await expect(args.onSubmitInvalid).toHaveBeenCalled()

    await userEvent.type(canvas.getByLabelText('Email'), 'not-an-email')
    await userEvent.click(submit)
    await expect(canvas.getByText('Enter a valid email address')).toBeVisible()

    await userEvent.clear(canvas.getByLabelText('Email'))
    await userEvent.type(canvas.getByLabelText('Email'), 'ada@example.com')
    await userEvent.type(canvas.getByLabelText('Password'), 'secret1')
    await userEvent.click(submit)
    await waitFor(() => expect(args.onSubmitSuccess).toHaveBeenCalled())
    await expect(canvas.getByRole('status')).toHaveTextContent(/Signed in/)
  },
}

export const BackendFieldError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Email'), 'taken@example.com')
    await userEvent.type(canvas.getByLabelText('Password'), 'secret1')
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(canvas.getByRole('alert')).toBeVisible())
    await expect(canvas.getByText('This email is already registered.')).toBeVisible()
  },
}

export const KeyboardAndReset: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const email = canvas.getByLabelText('Email')
    email.focus()
    await userEvent.keyboard('ada@example.com')
    await userEvent.tab()
    await userEvent.keyboard('secret1')
    await userEvent.click(canvas.getByRole('button', { name: 'Reset' }))
    await expect(email).toHaveValue('')
    await expect(args.onReset).toHaveBeenCalled()
  },
}

export const Dark: Story = {
  parameters: {
    previewTheme: 'light',
    docs: { description: { story: 'Canvas forced to light tokens (dark mode disabled).' } },
  },
}
