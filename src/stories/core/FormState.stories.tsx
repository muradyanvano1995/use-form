import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { LoginForm } from '../../examples/LoginForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Hooks/useForm',
  component: LoginForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'Primary form hook: owns values, defaultValues, errors, errorDetails, touched, dirty, isValid, isSubmitting, isValidating, submitCount, and async-default flags. The useForm caller re-renders on any store change; isolate children with useWatch / useFormState / useFieldState.',
          'LoginForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.basicUseForm),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof LoginForm>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }))
    await expect(canvas.getByText('Email is required')).toBeVisible()
  },
}
