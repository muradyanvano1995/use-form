import type { Meta, StoryObj } from '@storybook/react-vite'
import { RegistrationForm } from '../../examples/RegistrationForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Core Concepts/Submission',
  component: RegistrationForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'handleSubmit runs validation, focuses the first error when focusOnError is true, then onSubmit. preventDuplicateSubmit (default) blocks overlapping clicks. Successful registration resets the form.',
          'RegistrationForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.submission),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof RegistrationForm>

export default meta
type Story = StoryObj<typeof meta>

export const CreateAccount: Story = {}
