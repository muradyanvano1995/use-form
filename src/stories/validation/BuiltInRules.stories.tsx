import type { Meta, StoryObj } from '@storybook/react-vite'
import { RegistrationForm } from '../../examples/RegistrationForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Validation/Built-in rules',
  component: RegistrationForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'required, email, minLength, min, accepted, matchesField. See docs/validation.md. Custom createRule lives on the name field (admin token).',
          'RegistrationForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.builtInRules),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof RegistrationForm>

export default meta
type Story = StoryObj<typeof meta>

export const BuiltIns: Story = {}
