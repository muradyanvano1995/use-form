import type { Meta, StoryObj } from '@storybook/react-vite'
import { RegistrationForm } from '../../examples/RegistrationForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Validation/Custom rules',
  component: RegistrationForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'createRule builds a reusable sync rule. Here names containing “admin” fail. This is not the password-quality form (that story is Structured errors).',
          'RegistrationForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.customRules),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof RegistrationForm>

export default meta
type Story = StoryObj<typeof meta>

export const CreateRule: Story = {}
