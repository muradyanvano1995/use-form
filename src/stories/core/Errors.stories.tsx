import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { LoginForm } from '../../examples/LoginForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Core Concepts/Errors',
  component: LoginForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'Field errors from rules, backend mapping via helpers.setErrors, and submitError banners. Root errors (see Structured errors) are not focus targets. Trigger taken@example.com after filling a 6+ character password.',
          'LoginForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.backendErrors),
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
